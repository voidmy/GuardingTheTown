"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WsBridge = void 0;
const ws_1 = require("ws");
class WsBridge {
    constructor(port, timeoutMs) {
        this.port = port;
        this.timeoutMs = timeoutMs;
        this.wss = null;
        this.agent = null; // most-recently-connected preview agent
        this.pending = new Map();
        this.seq = 0;
    }
    start() {
        return new Promise((resolve, reject) => {
            this.wss = new ws_1.WebSocketServer({ host: '127.0.0.1', port: this.port });
            this.wss.on('listening', () => {
                // 监听后的运行期错误不再走 startup 的 reject(已 settle),单独记日志避免被吞。
                this.wss.on('error', (e) => console.error('[CyaCocosMcp] ws server error', e));
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
    stop() {
        var _a;
        this.rejectAllPending('bridge stopped');
        this.agent = null;
        (_a = this.wss) === null || _a === void 0 ? void 0 : _a.close();
        this.wss = null;
    }
    rejectAllPending(reason) {
        for (const [, p] of this.pending) {
            clearTimeout(p.timer);
            p.reject(new Error(reason));
        }
        this.pending.clear();
    }
    get agentConnected() {
        return !!this.agent && this.agent.readyState === ws_1.WebSocket.OPEN;
    }
    // Generic id-correlated request to the connected agent. Resolves with the agent's reply msg
    // (any non-error type); rejects on {type:'error'}, timeout, or when no preview is connected.
    request(payload) {
        if (!this.agentConnected)
            return Promise.reject(new Error('no preview connected — start Preview and ensure the dev agent loaded'));
        const id = `r${++this.seq}`;
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.pending.delete(id);
                reject(new Error('preview request timeout'));
            }, this.timeoutMs);
            this.pending.set(id, { resolve, reject, timer });
            this.agent.send(JSON.stringify({ ...payload, id }));
        });
    }
    requestCapture(maxWidth) {
        return this.request({ type: 'capture', maxWidth }).then((m) => m.png);
    }
    requestTap(x, y) {
        return this.request({ type: 'tap', x, y }).then(() => ({ ok: true }));
    }
    requestType(text, clear) {
        return this.request({ type: 'type', text, clear }).then(() => ({ ok: true }));
    }
    requestSwipe(x1, y1, x2, y2, durationMs, fling) {
        return this.request({ type: 'swipe', x1, y1, x2, y2, durationMs, fling }).then(() => ({ ok: true }));
    }
    onAgentMessage(raw) {
        let msg;
        try {
            msg = JSON.parse(raw);
        }
        catch {
            return;
        }
        const p = msg && this.pending.get(msg.id);
        if (!p)
            return;
        clearTimeout(p.timer);
        this.pending.delete(msg.id);
        if (msg.type === 'error')
            p.reject(new Error(msg.message || 'preview request failed'));
        else
            p.resolve(msg);
    }
}
exports.WsBridge = WsBridge;
