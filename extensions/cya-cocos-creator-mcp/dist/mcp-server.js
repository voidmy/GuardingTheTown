"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PreviewMcp = void 0;
const http = __importStar(require("http"));
const url_1 = require("url");
const ws_bridge_1 = require("./ws-bridge");
const preview_control_1 = require("./preview-control");
const editor_audio_recorder_host_1 = require("./editor-audio-recorder-host");
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
        description: 'Pause the running Cocos Creator in-editor Preview (3.8.7 exposes no window-close; the window stays open, the game halts; start_preview resumes it).',
        inputSchema: { type: 'object', properties: {} },
    },
    {
        name: 'preview_tap',
        description: 'Simulate a tap in the running Cocos Creator Preview at normalized coordinates (0..1 of the window; 0,0=top-left, 1,1=bottom-right). Capture a screenshot first to choose the point.',
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
        description: 'Simulate a swipe/drag in the running Preview from (x1,y1) to (x2,y2), normalized 0..1, over durationMs (default 300). By default the drag is momentum-free, so the content travels about the start->end distance; pass fling:true for an inertial flick that scrolls far past the delta.',
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
                    description: 'Default false = precise drag: content travels about the (x1,y1)->(x2,y2) distance (no momentum). true = inertial flick.',
                },
            },
            required: ['x1', 'y1', 'x2', 'y2'],
        },
    },
    {
        name: 'preview_type',
        description: 'Type into the currently focused Cocos Creator Preview EditBox. Tap the EditBox first; clear defaults to true.',
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
class PreviewMcp {
    constructor(settings) {
        this.settings = settings;
        this.httpServer = null;
        this.running = false;
        this.bridge = new ws_bridge_1.WsBridge(settings.wsPort, settings.timeoutMs);
        this.audioRecorderHost = new editor_audio_recorder_host_1.EditorAudioRecorderHost(settings.mcpPort);
    }
    async start() {
        if (this.running)
            return;
        await this.bridge.start();
        try {
            await new Promise((resolve, reject) => {
                this.httpServer = http.createServer((req, res) => this.handle(req, res));
                this.httpServer.on('error', reject);
                this.httpServer.listen(this.settings.mcpPort, '127.0.0.1', () => resolve());
            });
        }
        catch (e) {
            // mcpPort 占用等导致 http 起不来:回滚已起的 WS bridge,避免端口被占住且无法重试。
            this.bridge.stop();
            this.httpServer = null;
            throw e;
        }
        this.running = true;
        console.log(`[CyaCocosMcp] MCP http://127.0.0.1:${this.settings.mcpPort}/mcp  WS :${this.settings.wsPort}`);
    }
    stop() {
        var _a;
        this.audioRecorderHost.dispose();
        (_a = this.httpServer) === null || _a === void 0 ? void 0 : _a.close();
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
    async executeToolCall(name, args) {
        var _a, _b, _c;
        if (name === 'preview_screenshot') {
            const png = await this.bridge.requestCapture(args === null || args === void 0 ? void 0 : args.maxWidth);
            return { content: [{ type: 'image', data: png, mimeType: 'image/png' }] };
        }
        if (name === 'start_preview') {
            return { content: [{ type: 'text', text: JSON.stringify(await (0, preview_control_1.startPreview)()) }] };
        }
        if (name === 'stop_preview') {
            return { content: [{ type: 'text', text: JSON.stringify(await (0, preview_control_1.stopPreview)()) }] };
        }
        if (name === 'preview_tap') {
            return { content: [{ type: 'text', text: JSON.stringify(await this.bridge.requestTap(args === null || args === void 0 ? void 0 : args.x, args === null || args === void 0 ? void 0 : args.y)) }] };
        }
        if (name === 'preview_type') {
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(await this.bridge.requestType(String((_a = args === null || args === void 0 ? void 0 : args.text) !== null && _a !== void 0 ? _a : ''), (args === null || args === void 0 ? void 0 : args.clear) !== false)),
                    },
                ],
            };
        }
        if (name === 'preview_swipe') {
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(await this.bridge.requestSwipe(args === null || args === void 0 ? void 0 : args.x1, args === null || args === void 0 ? void 0 : args.y1, args === null || args === void 0 ? void 0 : args.x2, args === null || args === void 0 ? void 0 : args.y2, (_b = args === null || args === void 0 ? void 0 : args.durationMs) !== null && _b !== void 0 ? _b : 300, (_c = args === null || args === void 0 ? void 0 : args.fling) !== null && _c !== void 0 ? _c : false)),
                    },
                ],
            };
        }
        throw new Error(`unknown tool: ${name}`);
    }
    handle(req, res) {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Accept, Content-Type');
        // Chromium 的 packages: Preview 访问 loopback 时可能触发 Private Network Access 预检。
        res.setHeader('Access-Control-Allow-Private-Network', 'true');
        const pathname = new url_1.URL(req.url || '/', 'http://x').pathname;
        if (req.method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return;
        }
        if (this.audioRecorderHost.handleHttpRequest(req, res, pathname))
            return;
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
    async handleRpc(body, res) {
        var _a, _b, _c, _d, _e;
        let msg;
        try {
            msg = JSON.parse(body);
        }
        catch {
            res.writeHead(400);
            res.end(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'parse error' } }));
            return;
        }
        const id = (_a = msg.id) !== null && _a !== void 0 ? _a : null;
        try {
            let result;
            if (msg.method === 'initialize') {
                result = {
                    protocolVersion: '2024-11-05',
                    capabilities: { tools: {} },
                    serverInfo: { name: 'cya-cocos-creator-mcp', version: '0.1.0' },
                };
            }
            else if (msg.method === 'tools/list') {
                result = { tools: TOOLS };
            }
            else if (msg.method === 'tools/call') {
                result = await this.executeToolCall((_b = msg.params) === null || _b === void 0 ? void 0 : _b.name, (_d = (_c = msg.params) === null || _c === void 0 ? void 0 : _c.arguments) !== null && _d !== void 0 ? _d : {});
            }
            else {
                res.writeHead(200);
                res.end(JSON.stringify({ jsonrpc: '2.0', id, error: { code: -32601, message: `method not found: ${msg.method}` } }));
                return;
            }
            res.writeHead(200);
            res.end(JSON.stringify({ jsonrpc: '2.0', id, result }));
        }
        catch (e) {
            res.writeHead(200);
            res.end(JSON.stringify({ jsonrpc: '2.0', id, error: { code: -32000, message: String((_e = e === null || e === void 0 ? void 0 : e.message) !== null && _e !== void 0 ? _e : e) } }));
        }
    }
}
exports.PreviewMcp = PreviewMcp;
