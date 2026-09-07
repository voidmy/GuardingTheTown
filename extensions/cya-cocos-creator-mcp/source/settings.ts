import { join } from 'path';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';

export interface Settings {
  wsPort: number;
  mcpPort: number;
  timeoutMs: number;
  autoStart: boolean;
}

const DEFAULTS: Settings = { wsPort: 8765, mcpPort: 8766, timeoutMs: 8000, autoStart: true };

function settingsPath(): string {
  // Editor.Project.path is the project root inside the editor process
  const root = (globalThis as any).Editor?.Project?.path ?? process.cwd();
  return join(root, 'settings', 'cya-cocos-creator-mcp.json');
}

export function readSettings(): Settings {
  try {
    const p = settingsPath();
    if (existsSync(p)) return { ...DEFAULTS, ...JSON.parse(readFileSync(p, 'utf8')) };
  } catch {
    /* fall through to defaults */
  }
  return { ...DEFAULTS };
}

export function saveSettings(s: Settings): void {
  const p = settingsPath();
  mkdirSync(join(p, '..'), { recursive: true });
  writeFileSync(p, JSON.stringify(s, null, 2), 'utf8');
}
