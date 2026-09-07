import * as http from 'http';
import { URL } from 'url';
import { Settings } from './settings';
import { WsBridge } from './ws-bridge';
import { startPreview, stopPreview } from './preview-control';
import { EditorAudioRecorderHost } from './editor-audio-recorder-host';

const TOOLS = [
  {
    name: 'preview_screenshot',
    description: 'Capture the current Cocos Creator Preview (running game) frame and return it as a PNG image.',
    inputSchema: {
      type: 'object',
      properties: { maxWidth: { type: 'number', description: 'Optional: downscale so width <= maxWidth (px).' } },
    },
  },
  {
    name: 'start_preview',
    description: 'Launch/show the Cocos Creator in-editor Preview window (runs the project; no browser needed).',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'stop_preview',
    description:
      'Pause the running Cocos Creator in-editor Preview (3.8.7 exposes no window-close; the window stays open, the game halts; start_preview resumes it).',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'preview_tap',
    description:
      'Simulate a tap in the running Cocos Creator Preview at normalized coordinates (0..1 of the window; 0,0=top-left, 1,1=bottom-right). Capture a screenshot first to choose the point.',
    inputSchema: {
      type: 'object',
      properties: {
        x: { type: 'number', description: 'Horizontal position, 0..1 (fraction of window width).' },
        y: { type: 'number', description: 'Vertical position, 0..1 (fraction of window height).' },
      },
      required: ['x', 'y'],
    },
  },
  {
    name: 'preview_swipe',
    description:
      'Simulate a swipe/drag in the running Preview from (x1,y1) to (x2,y2), normalized 0..1, over durationMs (default 300). By default the drag is momentum-free, so the content travels about the start->end distance; pass fling:true for an inertial flick that scrolls far past the delta.',
    inputSchema: {
      type: 'object',
      properties: {
        x1: { type: 'number', description: 'Start x, 0..1.' },
        y1: { type: 'number', description: 'Start y, 0..1.' },
        x2: { type: 'number', description: 'End x, 0..1.' },
        y2: { type: 'number', description: 'End y, 0..1.' },
        durationMs: { type: 'number', description: 'Swipe duration in ms (default 300).' },
        fling: {
          type: 'boolean',
          description:
            'Default false = precise drag: content travels about the (x1,y1)->(x2,y2) distance (no momentum). true = inertial flick.',
        },
      },
      required: ['x1', 'y1', 'x2', 'y2'],
    },
  },
  {
    name: 'preview_type',
    description:
      'Type into the currently focused Cocos Creator Preview EditBox. Tap the EditBox first; clear defaults to true.',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Text to enter into the focused EditBox.' },
        clear: { type: 'boolean', description: 'Replace existing text when true (default); append when false.' },
      },
      required: ['text'],
    },
  },
];

export class PreviewMcp {
  private httpServer: http.Server | null = null;
  private bridge: WsBridge;
  private audioRecorderHost: EditorAudioRecorderHost;
  private running = false;

  constructor(public settings: Settings) {
    this.bridge = new WsBridge(settings.wsPort, settings.timeoutMs);
    this.audioRecorderHost = new EditorAudioRecorderHost(settings.mcpPort);
  }

  async start(): Promise<void> {
    if (this.running) return;
    await this.bridge.start();
    try {
      await new Promise<void>((resolve, reject) => {
        this.httpServer = http.createServer((req, res) => this.handle(req, res));
        this.httpServer.on('error', reject);
        this.httpServer.listen(this.settings.mcpPort, '127.0.0.1', () => resolve());
      });
    } catch (e) {
      // mcpPort 占用等导致 http 起不来:回滚已起的 WS bridge,避免端口被占住且无法重试。
      this.bridge.stop();
      this.httpServer = null;
      throw e;
    }
    this.running = true;
    console.log(`[CyaCocosMcp] MCP http://127.0.0.1:${this.settings.mcpPort}/mcp  WS :${this.settings.wsPort}`);
  }

  stop(): void {
    this.audioRecorderHost.dispose();
    this.httpServer?.close();
    this.httpServer = null;
    this.bridge.stop();
    this.running = false;
  }

  getStatus() {
    return {
      running: this.running,
      mcpPort: this.settings.mcpPort,
      wsPort: this.settings.wsPort,
      agentConnected: this.bridge.agentConnected,
    };
  }

  async executeToolCall(name: string, args: any): Promise<any> {
    if (name === 'preview_screenshot') {
      const png = await this.bridge.requestCapture(args?.maxWidth);
      return { content: [{ type: 'image', data: png, mimeType: 'image/png' }] };
    }
    if (name === 'start_preview') {
      return { content: [{ type: 'text', text: JSON.stringify(await startPreview()) }] };
    }
    if (name === 'stop_preview') {
      return { content: [{ type: 'text', text: JSON.stringify(await stopPreview()) }] };
    }
    if (name === 'preview_tap') {
      return { content: [{ type: 'text', text: JSON.stringify(await this.bridge.requestTap(args?.x, args?.y)) }] };
    }
    if (name === 'preview_type') {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(await this.bridge.requestType(String(args?.text ?? ''), args?.clear !== false)),
          },
        ],
      };
    }
    if (name === 'preview_swipe') {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              await this.bridge.requestSwipe(
                args?.x1,
                args?.y1,
                args?.x2,
                args?.y2,
                args?.durationMs ?? 300,
                args?.fling ?? false,
              ),
            ),
          },
        ],
      };
    }
    throw new Error(`unknown tool: ${name}`);
  }

  private handle(req: http.IncomingMessage, res: http.ServerResponse): void {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Accept, Content-Type');
    // Chromium 的 packages: Preview 访问 loopback 时可能触发 Private Network Access 预检。
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
    const pathname = new URL(req.url || '/', 'http://x').pathname;
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }
    if (this.audioRecorderHost.handleHttpRequest(req, res, pathname)) return;

    res.setHeader('Content-Type', 'application/json');
    if (req.method === 'GET' && pathname === '/health') {
      res.writeHead(200);
      res.end(JSON.stringify({ ok: true }));
      return;
    }
    if (req.method !== 'POST' || pathname !== '/mcp') {
      res.writeHead(404);
      res.end('{}');
      return;
    }
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      void this.handleRpc(body, res);
    });
  }

  private async handleRpc(body: string, res: http.ServerResponse): Promise<void> {
    let msg: any;
    try {
      msg = JSON.parse(body);
    } catch {
      res.writeHead(400);
      res.end(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'parse error' } }));
      return;
    }
    const id = msg.id ?? null;
    try {
      let result: any;
      if (msg.method === 'initialize') {
        result = {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name: 'cya-cocos-creator-mcp', version: '0.1.0' },
        };
      } else if (msg.method === 'tools/list') {
        result = { tools: TOOLS };
      } else if (msg.method === 'tools/call') {
        result = await this.executeToolCall(msg.params?.name, msg.params?.arguments ?? {});
      } else {
        res.writeHead(200);
        res.end(
          JSON.stringify({ jsonrpc: '2.0', id, error: { code: -32601, message: `method not found: ${msg.method}` } }),
        );
        return;
      }
      res.writeHead(200);
      res.end(JSON.stringify({ jsonrpc: '2.0', id, result }));
    } catch (e: any) {
      res.writeHead(200);
      res.end(JSON.stringify({ jsonrpc: '2.0', id, error: { code: -32000, message: String(e?.message ?? e) } }));
    }
  }
}
