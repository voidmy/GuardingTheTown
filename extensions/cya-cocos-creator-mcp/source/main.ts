import { readSettings } from './settings';
import { PreviewMcp } from './mcp-server';

let server: PreviewMcp | null = null;

export const methods: { [key: string]: (...args: any[]) => any } = {
  openPanel() {
    Editor.Panel.open('cya-cocos-creator-mcp');
  },
  async startServer() {
    server ??= new PreviewMcp(readSettings());
    await server.start();
  },
  stopServer() {
    server?.stop();
  },
  getServerStatus() {
    return server ? server.getStatus() : { running: false };
  },
};

export function load() {
  const s = readSettings();
  server = new PreviewMcp(s);
  if (s.autoStart) server.start().catch((e) => console.error('[CyaCocosMcp] autostart failed', e));
}

export function unload() {
  server?.stop();
  server = null;
}
