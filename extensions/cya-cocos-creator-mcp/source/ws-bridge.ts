import { WebSocketServer, WebSocket } from 'ws';

interface Pending {
  resolve: (msg: any) => void;
  reject: (e: Error) => void;
  timer: NodeJS.Timeout;
}

export class WsBridge {
  private wss: WebSocketServer | null = null;
  private agent: WebSocket | null = null; // most-recently-connected preview agent
  private pending = new Map<string, Pending>();
  private seq = 0;

  constructor(
    private port: number,
    private timeoutMs: number,
  ) {}

  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.wss = new WebSocketServer({ host: '127.0.0.1', port: this.port });
      this.wss.on('listening', () => {
        // 监听后的运行期错误不再走 startup 的 reject(已 settle),单独记日志避免被吞。
        this.wss!.on('error', (e) => console.error('[CyaCocosMcp] ws server error', e));
        resolve();
      });
      this.wss.on('error', reject); // 仅用于 listen 失败(如端口占用)→ 拒绝 start()
      this.wss.on('connection', (ws) => {
        this.agent = ws; // latest wins
        ws.on('message', (d) => this.onAgentMessage(d.toString()));
        ws.on('close', () => {
          if (this.agent === ws) {
            this.agent = null;
            // Preview 断开 → 在飞的截图请求立即失败,不必等满 timeout。
            this.rejectAllPending('preview disconnected');
          }
        });
      });
    });
  }

  stop(): void {
    this.rejectAllPending('bridge stopped');
    this.agent = null;
    this.wss?.close();
    this.wss = null;
  }

  private rejectAllPending(reason: string): void {
    for (const [, p] of this.pending) {
      clearTimeout(p.timer);
      p.reject(new Error(reason));
    }
    this.pending.clear();
  }

  get agentConnected(): boolean {
    return !!this.agent && this.agent.readyState === WebSocket.OPEN;
  }

  // Generic id-correlated request to the connected agent. Resolves with the agent's reply msg
  // (any non-error type); rejects on {type:'error'}, timeout, or when no preview is connected.
  private request(payload: Record<string, unknown>): Promise<any> {
    if (!this.agentConnected)
      return Promise.reject(new Error('no preview connected — start Preview and ensure the dev agent loaded'));
    const id = `r${++this.seq}`;
    return new Promise<any>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error('preview request timeout'));
      }, this.timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      this.agent!.send(JSON.stringify({ ...payload, id }));
    });
  }

  requestCapture(maxWidth?: number): Promise<string> {
    return this.request({ type: 'capture', maxWidth }).then((m) => m.png as string);
  }

  requestTap(x: number, y: number): Promise<{ ok: true }> {
    return this.request({ type: 'tap', x, y }).then(() => ({ ok: true as const }));
  }

  requestType(text: string, clear: boolean): Promise<{ ok: true }> {
    return this.request({ type: 'type', text, clear }).then(() => ({ ok: true as const }));
  }

  requestSwipe(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    durationMs: number,
    fling: boolean,
  ): Promise<{ ok: true }> {
    return this.request({ type: 'swipe', x1, y1, x2, y2, durationMs, fling }).then(() => ({ ok: true as const }));
  }

  private onAgentMessage(raw: string): void {
    let msg: any;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    const p = msg && this.pending.get(msg.id);
    if (!p) return;
    clearTimeout(p.timer);
    this.pending.delete(msg.id);
    if (msg.type === 'error') p.reject(new Error(msg.message || 'preview request failed'));
    else p.resolve(msg);
  }
}
