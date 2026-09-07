"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const settings_1 = require("../settings");
module.exports = Editor.Panel.define({
    template: '<div style="padding:12px;font-family:sans-serif"><h3>CYA Cocos Creator MCP</h3><pre id="info"></pre><button id="start">Start</button> <button id="stop">Stop</button></div>',
    style: '',
    $: { info: '#info', start: '#start', stop: '#stop' },
    async ready() {
        const refresh = async () => {
            const st = await Editor.Message.request('cya-cocos-creator-mcp', 'get-server-status');
            this.$.info.textContent = JSON.stringify(st, null, 2);
        };
        this.$.start.addEventListener('click', async () => {
            await Editor.Message.request('cya-cocos-creator-mcp', 'start-server');
            void refresh();
        });
        this.$.stop.addEventListener('click', async () => {
            await Editor.Message.request('cya-cocos-creator-mcp', 'stop-server');
            void refresh();
        });
        const s = (0, settings_1.readSettings)();
        await refresh();
        void s;
    },
});
