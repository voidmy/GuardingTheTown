"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.methods = void 0;
exports.load = load;
exports.unload = unload;
const settings_1 = require("./settings");
const mcp_server_1 = require("./mcp-server");
let server = null;
exports.methods = {
    openPanel() {
        Editor.Panel.open('cya-cocos-creator-mcp');
    },
    async startServer() {
        server !== null && server !== void 0 ? server : (server = new mcp_server_1.PreviewMcp((0, settings_1.readSettings)()));
        await server.start();
    },
    stopServer() {
        server === null || server === void 0 ? void 0 : server.stop();
    },
    getServerStatus() {
        return server ? server.getStatus() : { running: false };
    },
};
function load() {
    const s = (0, settings_1.readSettings)();
    server = new mcp_server_1.PreviewMcp(s);
    if (s.autoStart)
        server.start().catch((e) => console.error('[CyaCocosMcp] autostart failed', e));
}
function unload() {
    server === null || server === void 0 ? void 0 : server.stop();
    server = null;
}
