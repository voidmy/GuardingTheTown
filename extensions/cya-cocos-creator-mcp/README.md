# CYA Cocos Creator MCP

A Cocos Creator editor extension that hosts an MCP server whose `preview_screenshot` tool
returns the current full Preview frame as a PNG, captured by a dev-only in-game agent.

## Ports (loopback only, 127.0.0.1)

- WebSocket bridge: **8765** (agent → extension)
- MCP HTTP JSON-RPC: **8766** (`POST /mcp`, `GET /health`)

## Build

```bash
cd extensions/cya-cocos-creator-mcp
npm install
npm run build
```

This compiles `source/` → `dist/` (`dist/main.js`, `dist/settings.js`, `dist/panel/index.js`).

## Enable

In Cocos Creator → Extension Manager, enable **CYA Cocos Creator MCP**. Then use the menu
`Extension / CYA Cocos Creator MCP / Open Panel` to open the panel and Start/Stop the server.

## Register the MCP server

The extension serves MCP over HTTP JSON-RPC at `http://127.0.0.1:8766/mcp`. Register it with
your MCP client. For Claude Code, add to `.mcp.json` (or your MCP settings):

```json
{
  "mcpServers": {
    "cya-cocos-creator-mcp": { "type": "http", "url": "http://127.0.0.1:8766/mcp" }
  }
}
```

(Match the exact config format your client uses for the existing `cocos-mcp-server`.)

## Use

1. Build + enable the extension (above); open the panel and click **Start** (status shows
   `running:true`, `mcpPort:8766`, `wsPort:8765`).
2. Run **Preview** (browser or in-editor). The dev agent auto-connects — the panel's
   `agentConnected` flips to `true`. (The agent loads only in Preview, via a `PREVIEW`-guarded
   import in the game's launch component; it is inert in release builds.)
3. Call the `preview_screenshot` tool from your MCP client (optional `maxWidth` to downscale).
   It returns the current Preview frame as a PNG.

Quick manual check without an MCP client:

```bash
curl -s -XPOST http://127.0.0.1:8766/mcp -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"preview_screenshot","arguments":{}}}' \
  | python3 -c "import sys,json,base64; d=json.load(sys.stdin); open('/tmp/shot.png','wb').write(base64.b64decode(d['result']['content'][0]['data'])); print('wrote /tmp/shot.png')"
```

## Notes

- Ports are configurable in `settings/cya-cocos-creator-mcp.json` (`wsPort`/`mcpPort`/`timeoutMs`/`autoStart`).
  The agent's WS port defaults to 8765, overridable at runtime via `globalThis.__PREVIEW_SHOT_WS_PORT__`.
- If a screenshot comes back blank/black, the capture frame-timing needs tuning: switch the
  agent's `Director.EVENT_AFTER_DRAW` to `Director.EVENT_END_FRAME` in
  `assets/game/scripts/dev/PreviewScreenshotAgent.ts`.
- "No preview connected" from the tool means Preview isn't running (or the agent hasn't connected yet).
