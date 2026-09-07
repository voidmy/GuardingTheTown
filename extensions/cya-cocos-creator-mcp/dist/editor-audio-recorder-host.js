"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EditorAudioRecorderHost = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
const ROUTE_PREFIX = '/editor-audio-recorder';
const MAX_REQUEST_BODY_BYTES = 64 * 1024;
const MAX_DURATION_MS = 20000;
const COMPLETED_SESSION_CACHE_MS = 30000;
let captureWindowSequence = 0;
/**
 * Cocos Creator in-editor Preview 使用 packages: 非安全协议，Chromium 会直接移除
 * navigator.mediaDevices。扩展主进程因此创建一个隔离的 127.0.0.1 BrowserWindow：
 * 系统权限仍归 CocosCreator.app，但麦克风页面运行在安全来源中。
 */
class EditorAudioRecorderHost {
    constructor(port) {
        this.port = port;
        this.active = null;
        this.capturePageCache = null;
    }
    handles(pathname) {
        return pathname === ROUTE_PREFIX || pathname.startsWith(`${ROUTE_PREFIX}/`);
    }
    /**
     * 返回 true 表示请求已接管。异步错误统一在内部转成 JSON，不能冒泡到 MCP 路由。
     */
    handleHttpRequest(req, res, pathname) {
        if (!this.handles(pathname))
            return false;
        void this.route(req, res, pathname);
        return true;
    }
    dispose() {
        this.releaseActive();
    }
    async route(req, res, pathname) {
        var _a, _b;
        try {
            if (req.method === 'OPTIONS') {
                res.writeHead(204);
                res.end();
                return;
            }
            if (req.method === 'GET' && pathname === `${ROUTE_PREFIX}/health`) {
                this.writeJson(res, 200, {
                    ok: true,
                    platform: process.platform,
                    activeSessionId: (_b = (_a = this.active) === null || _a === void 0 ? void 0 : _a.sessionId) !== null && _b !== void 0 ? _b : '',
                });
                return;
            }
            if (req.method === 'GET' && pathname === `${ROUTE_PREFIX}/capture`) {
                res.setHeader('Content-Type', 'text/html; charset=utf-8');
                res.setHeader('Cache-Control', 'no-store');
                res.writeHead(200);
                res.end(this.readCapturePage());
                return;
            }
            if (req.method !== 'POST') {
                throw new HostError('METHOD_NOT_ALLOWED', '编辑器录音桥接只接受 POST 请求', 405);
            }
            const body = await readJsonBody(req);
            switch (pathname) {
                case `${ROUTE_PREFIX}/start`:
                    this.writeJson(res, 200, await this.start(validateStartRequest(body)));
                    return;
                case `${ROUTE_PREFIX}/status`:
                    this.writeJson(res, 200, await this.status(validateSessionRequest(body)));
                    return;
                case `${ROUTE_PREFIX}/stop`:
                    this.writeJson(res, 200, await this.stop(validateSessionRequest(body)));
                    return;
                case `${ROUTE_PREFIX}/cancel`:
                    this.writeJson(res, 200, await this.cancel(validateSessionRequest(body)));
                    return;
                default:
                    throw new HostError('NOT_FOUND', `未知编辑器录音桥接路径：${pathname}`, 404);
            }
        }
        catch (error) {
            const normalized = normalizeHostError(error);
            this.writeJson(res, normalized.statusCode, {
                ok: false,
                error: {
                    code: normalized.code,
                    message: normalized.message,
                },
            });
        }
    }
    async start(request) {
        var _a;
        // 已完成会话只保留很短时间，用于吸收 stop/status 的并发迟到请求；
        // 新录音可以立即替换它，不会被缓存结果误判为 BUSY。
        if (((_a = this.active) === null || _a === void 0 ? void 0 : _a.state) === 'completed') {
            this.releaseActive();
        }
        if (this.active) {
            throw new HostError('BUSY', `编辑器已有录音会话：${this.active.sessionId}`, 409);
        }
        const active = {
            sessionId: request.sessionId,
            window: null,
            state: 'starting',
        };
        this.active = active;
        try {
            const captureWindow = await this.createCaptureWindow(active);
            this.assertCurrent(active);
            const snapshot = await invokeCapturePage(captureWindow, 'start', request, true);
            this.assertCurrent(active);
            if (snapshot.state !== 'recording') {
                throw pageSnapshotError(snapshot, 'CAPTURE_START_FAILED', '安全录音页没有进入 recording 状态');
            }
            active.state = 'recording';
            return {
                ok: true,
                sessionId: active.sessionId,
                state: 'recording',
            };
        }
        catch (error) {
            if (this.active === active)
                this.releaseActive();
            throw normalizeCaptureError(error);
        }
    }
    async status(request) {
        const active = this.requireSession(request.sessionId);
        if (active.state === 'completed') {
            return this.completedResponse(active);
        }
        const captureWindow = this.requireWindow(active);
        const snapshot = await invokeCapturePage(captureWindow, 'snapshot');
        this.assertCurrent(active);
        if (snapshot.state === 'failed') {
            throw pageSnapshotError(snapshot, 'CAPTURE_FAILED', '安全录音页采集失败');
        }
        if (snapshot.state === 'completed') {
            const result = validateCaptureResult(snapshot.result);
            this.cacheCompleted(active, result);
            return this.completedResponse(active);
        }
        if (snapshot.state !== 'starting' && snapshot.state !== 'recording' && snapshot.state !== 'stopping') {
            throw new HostError('INVALID_CAPTURE_STATE', `安全录音页返回无效状态：${String(snapshot.state)}`, 500);
        }
        return {
            ok: true,
            sessionId: active.sessionId,
            state: snapshot.state === 'starting' ? 'starting' : 'recording',
            level: clampLevel(snapshot.level),
        };
    }
    async stop(request) {
        const active = this.requireSession(request.sessionId);
        if (active.state === 'completed') {
            return this.completedResponse(active);
        }
        const captureWindow = this.requireWindow(active);
        try {
            const snapshot = await invokeCapturePage(captureWindow, 'stop');
            this.assertCurrent(active);
            if (snapshot.state !== 'completed') {
                throw pageSnapshotError(snapshot, 'CAPTURE_STOP_FAILED', '安全录音页没有完成音频封口');
            }
            this.cacheCompleted(active, validateCaptureResult(snapshot.result));
            return this.completedResponse(active);
        }
        catch (error) {
            if (this.active === active)
                this.releaseActive();
            throw error;
        }
    }
    async cancel(request) {
        const active = this.requireSession(request.sessionId);
        const captureWindow = active.window;
        // 先从全局占用中摘除，任何迟到的 start/stop 都无法再成为当前结果。
        this.active = null;
        if (captureWindow && !captureWindow.isDestroyed()) {
            try {
                await invokeCapturePage(captureWindow, 'cancel');
            }
            catch {
                // 关闭 BrowserWindow 会终止权限等待、MediaRecorder 和所有 MediaStreamTrack。
            }
            destroyWindow(captureWindow);
        }
        return {
            ok: true,
            sessionId: active.sessionId,
            state: 'cancelled',
        };
    }
    async createCaptureWindow(active) {
        const electron = loadElectron();
        const captureUrl = this.captureUrl();
        const expectedOrigin = new URL(captureUrl).origin;
        // 每次采集使用独立的临时 session，旧 cancel 的权限清理不会影响紧随其后的新录音。
        const partition = `cya-editor-audio-recorder-${process.pid}-${++captureWindowSequence}`;
        const captureWindow = new electron.BrowserWindow({
            width: 360,
            height: 240,
            show: false,
            webPreferences: {
                partition,
                backgroundThrottling: false,
                contextIsolation: true,
                nodeIntegration: false,
                sandbox: true,
            },
        });
        active.window = captureWindow;
        const captureSession = captureWindow.webContents.session;
        captureSession.setPermissionCheckHandler((_webContents, permission, requestingOrigin, details) => {
            return (permission === 'media' &&
                sameOrigin(requestingOrigin, expectedOrigin) &&
                allowsAudioOnly(details.mediaType ? [details.mediaType] : undefined));
        });
        captureSession.setPermissionRequestHandler((webContents, permission, callback, details) => {
            callback(permission === 'media' &&
                sameOrigin(webContents.getURL(), expectedOrigin) &&
                allowsAudioOnly(details.mediaTypes));
        });
        captureWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
        captureWindow.webContents.on('will-navigate', (event, navigationUrl) => {
            if (!sameOrigin(navigationUrl, expectedOrigin) || new URL(navigationUrl).pathname !== `${ROUTE_PREFIX}/capture`) {
                event.preventDefault();
            }
        });
        captureWindow.webContents.on('render-process-gone', () => {
            if (this.active === active && active.state !== 'completed') {
                this.releaseActive();
            }
        });
        captureWindow.on('closed', () => {
            if (this.active === active) {
                active.window = null;
                if (active.state !== 'completed')
                    this.releaseActive();
            }
        });
        await captureWindow.loadURL(captureUrl);
        this.assertCurrent(active);
        if (captureWindow.isDestroyed()) {
            throw new HostError('CAPTURE_WINDOW_CLOSED', '编辑器安全录音页已关闭', 500);
        }
        const capabilities = await invokeCapturePage(captureWindow, 'capabilities');
        if (!capabilities.supported) {
            throw new HostError('NOT_SUPPORTED', capabilities.message || '编辑器安全录音页不支持 getUserMedia/MediaRecorder', 501);
        }
        return captureWindow;
    }
    captureUrl() {
        return `http://127.0.0.1:${this.port}${ROUTE_PREFIX}/capture`;
    }
    requireSession(sessionId) {
        const active = this.active;
        if (!active) {
            throw new HostError('NOT_RECORDING', '编辑器当前没有录音会话', 409);
        }
        if (active.sessionId !== sessionId) {
            throw new HostError('SESSION_MISMATCH', `编辑器当前录音会话是 ${active.sessionId}，不是 ${sessionId}`, 409);
        }
        return active;
    }
    requireWindow(active) {
        const captureWindow = active.window;
        if (!captureWindow || captureWindow.isDestroyed()) {
            throw new HostError('CAPTURE_WINDOW_CLOSED', '编辑器安全录音页不可用', 500);
        }
        return captureWindow;
    }
    assertCurrent(active) {
        if (this.active !== active) {
            throw new HostError('CANCELLED', '编辑器录音会话已取消', 409);
        }
    }
    releaseActive() {
        const active = this.active;
        this.active = null;
        if (!active)
            return;
        if (active.expiryTimer)
            clearTimeout(active.expiryTimer);
        if (active.window)
            destroyWindow(active.window);
    }
    cacheCompleted(active, result) {
        this.assertCurrent(active);
        active.state = 'completed';
        active.result = result;
        if (active.window) {
            destroyWindow(active.window);
            active.window = null;
        }
        if (active.expiryTimer)
            clearTimeout(active.expiryTimer);
        active.expiryTimer = setTimeout(() => {
            if (this.active === active)
                this.releaseActive();
        }, COMPLETED_SESSION_CACHE_MS);
    }
    completedResponse(active) {
        return {
            ok: true,
            sessionId: active.sessionId,
            state: 'completed',
            level: 0,
            result: validateCaptureResult(active.result),
        };
    }
    readCapturePage() {
        if (this.capturePageCache === null) {
            this.capturePageCache = (0, fs_1.readFileSync)((0, path_1.join)(__dirname, '..', 'static', 'editor-audio-capture.html'), 'utf8');
        }
        return this.capturePageCache;
    }
    writeJson(res, statusCode, body) {
        if (res.writableEnded)
            return;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        res.writeHead(statusCode);
        res.end(JSON.stringify(body));
    }
}
exports.EditorAudioRecorderHost = EditorAudioRecorderHost;
class HostError extends Error {
    constructor(code, message, statusCode) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.name = 'HostError';
    }
}
function loadElectron() {
    try {
        // 仅在 Cocos Creator 扩展主进程收到 start 时加载；Vitest/普通 Node 导入本模块不会 require Electron。
        return require('electron');
    }
    catch (error) {
        throw new HostError('EDITOR_ELECTRON_UNAVAILABLE', `无法加载 Cocos Creator Electron 录音宿主：${error instanceof Error ? error.message : String(error)}`, 501);
    }
}
async function invokeCapturePage(captureWindow, method, argument, userGesture = false) {
    if (captureWindow.isDestroyed()) {
        throw new HostError('CAPTURE_WINDOW_CLOSED', '编辑器安全录音页已关闭', 500);
    }
    const methodJson = JSON.stringify(method);
    const argumentJson = argument === undefined ? 'undefined' : JSON.stringify(argument);
    const script = `(async () => {
    try {
      const api = window.editorAudioCapture;
      if (!api || typeof api[${methodJson}] !== 'function') {
        throw new Error('editorAudioCapture.${method} is unavailable');
      }
      return { ok: true, value: await api[${methodJson}](${argumentJson}) };
    } catch (error) {
      return {
        ok: false,
        error: {
          name: error && error.name ? String(error.name) : 'Error',
          message: error && error.message ? String(error.message) : String(error)
        }
      };
    }
  })()`;
    const result = (await captureWindow.webContents.executeJavaScript(script, userGesture));
    if (!(result === null || result === void 0 ? void 0 : result.ok))
        throw pageErrorToHostError(result === null || result === void 0 ? void 0 : result.error);
    return result.value;
}
function validateStartRequest(value) {
    const sessionId = readSessionId(value);
    const sampleRate = readPositiveInteger(value.sampleRate, 'sampleRate');
    const minDurationMs = readFiniteNumber(value.minDurationMs, 'minDurationMs');
    const maxDurationMs = readFiniteNumber(value.maxDurationMs, 'maxDurationMs');
    if (minDurationMs < 0 || maxDurationMs <= minDurationMs || maxDurationMs > MAX_DURATION_MS) {
        throw new HostError('INVALID_OPTIONS', `录音时长必须满足 0 <= minDurationMs < maxDurationMs <= ${MAX_DURATION_MS}`, 400);
    }
    return { sessionId, sampleRate, minDurationMs, maxDurationMs };
}
function validateSessionRequest(value) {
    return { sessionId: readSessionId(value) };
}
function readSessionId(value) {
    const sessionId = value.sessionId;
    if (typeof sessionId !== 'string' || !sessionId || sessionId.length > 160) {
        throw new HostError('INVALID_SESSION_ID', 'sessionId 必须是非空短字符串', 400);
    }
    return sessionId;
}
function readPositiveInteger(value, name) {
    if (!Number.isInteger(value) || value <= 0) {
        throw new HostError('INVALID_OPTIONS', `${name} 必须是正整数`, 400);
    }
    return value;
}
function readFiniteNumber(value, name) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new HostError('INVALID_OPTIONS', `${name} 必须是有限数值`, 400);
    }
    return value;
}
function validateCaptureResult(value) {
    if (!value ||
        (value.reason !== 'stopped' && value.reason !== 'max-duration') ||
        typeof value.mimeType !== 'string' ||
        !value.mimeType ||
        typeof value.audioBase64 !== 'string' ||
        !value.audioBase64) {
        throw new HostError('INVALID_CAPTURE_RESULT', '安全录音页返回的音频结果不完整', 500);
    }
    return value;
}
function clampLevel(value) {
    return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
}
function allowsAudioOnly(mediaTypes) {
    // 某些 Creator 内置 Electron 版本的 check details 不带 mediaTypes；
    // 页面本身固定请求 video:false，request handler 仍会拒绝任何明确的视频请求。
    return !mediaTypes || (mediaTypes.includes('audio') && !mediaTypes.includes('video'));
}
function sameOrigin(value, expectedOrigin) {
    try {
        return new URL(value).origin === expectedOrigin;
    }
    catch {
        return false;
    }
}
function destroyWindow(captureWindow) {
    if (captureWindow.isDestroyed())
        return;
    try {
        captureWindow.webContents.session.setPermissionCheckHandler(null);
        captureWindow.webContents.session.setPermissionRequestHandler(null);
    }
    catch {
        // 编辑器退出过程中 session 可能已经销毁，继续关闭窗口。
    }
    captureWindow.destroy();
}
function pageSnapshotError(snapshot, code, fallback) {
    return pageErrorToHostError(snapshot.error, code, fallback);
}
function pageErrorToHostError(error, fallbackCode = 'CAPTURE_FAILED', fallbackMessage = '编辑器安全录音页执行失败') {
    const name = (error === null || error === void 0 ? void 0 : error.name) || '';
    const message = (error === null || error === void 0 ? void 0 : error.message) || fallbackMessage;
    switch (name) {
        case 'NotAllowedError':
        case 'PermissionDeniedError':
            return new HostError('PERMISSION_DENIED', '麦克风权限被拒绝，请在 macOS 系统设置中允许 CocosDashboard（Cocos Creator）使用麦克风', 403);
        case 'NotFoundError':
        case 'DevicesNotFoundError':
            return new HostError('NO_INPUT_DEVICE', '没有找到可用麦克风', 404);
        case 'NotReadableError':
        case 'TrackStartError':
            return new HostError('INPUT_BUSY', '麦克风无法读取，可能正被其他应用独占', 409);
        case 'NotSupportedError':
            return new HostError('NOT_SUPPORTED', message, 501);
        case 'AbortError':
            return new HostError('CANCELLED', message, 409);
        default:
            return new HostError(fallbackCode, message, 500);
    }
}
function normalizeCaptureError(error) {
    return error instanceof HostError
        ? error
        : new HostError('CAPTURE_START_FAILED', error instanceof Error ? error.message : String(error), 500);
}
function normalizeHostError(error) {
    return error instanceof HostError
        ? error
        : new HostError('EDITOR_RECORDER_INTERNAL_ERROR', error instanceof Error ? error.message : String(error), 500);
}
function readJsonBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        let size = 0;
        let tooLarge = false;
        req.setEncoding('utf8');
        req.on('data', (chunk) => {
            if (tooLarge)
                return;
            size += Buffer.byteLength(chunk);
            if (size > MAX_REQUEST_BODY_BYTES) {
                tooLarge = true;
                reject(new HostError('REQUEST_TOO_LARGE', '编辑器录音桥接请求体过大', 413));
                return;
            }
            body += chunk;
        });
        req.on('end', () => {
            if (tooLarge)
                return;
            try {
                const parsed = body ? JSON.parse(body) : {};
                if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
                    throw new Error('request body is not an object');
                }
                resolve(parsed);
            }
            catch {
                reject(new HostError('INVALID_JSON', '编辑器录音桥接请求不是有效 JSON', 400));
            }
        });
        req.on('error', reject);
    });
}
