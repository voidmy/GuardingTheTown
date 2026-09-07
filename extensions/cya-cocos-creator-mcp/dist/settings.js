"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readSettings = readSettings;
exports.saveSettings = saveSettings;
const path_1 = require("path");
const fs_1 = require("fs");
const DEFAULTS = { wsPort: 8765, mcpPort: 8766, timeoutMs: 8000, autoStart: true };
function settingsPath() {
    var _a, _b, _c;
    // Editor.Project.path is the project root inside the editor process
    const root = (_c = (_b = (_a = globalThis.Editor) === null || _a === void 0 ? void 0 : _a.Project) === null || _b === void 0 ? void 0 : _b.path) !== null && _c !== void 0 ? _c : process.cwd();
    return (0, path_1.join)(root, 'settings', 'cya-cocos-creator-mcp.json');
}
function readSettings() {
    try {
        const p = settingsPath();
        if ((0, fs_1.existsSync)(p))
            return { ...DEFAULTS, ...JSON.parse((0, fs_1.readFileSync)(p, 'utf8')) };
    }
    catch {
        /* fall through to defaults */
    }
    return { ...DEFAULTS };
}
function saveSettings(s) {
    const p = settingsPath();
    (0, fs_1.mkdirSync)((0, path_1.join)(p, '..'), { recursive: true });
    (0, fs_1.writeFileSync)(p, JSON.stringify(s, null, 2), 'utf8');
}
