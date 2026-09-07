"use strict";
// extensions/cya-cocos-creator-mcp/source/preview-control.ts
// Start / stop the Cocos Creator in-editor Preview via editor messages on the 'scene' package.
// Mechanism verified live against Cocos Creator 3.8.7 (see docs spec/plan):
//   - `create-preview-window` (handler preview.createPreviewWindow) opens & runs the in-editor preview
//     window ([PreviewInEditor]); idempotent when one is already open.
//   - `editor-preview-set-play` (bool) SETS the game-view play state — true=play/resume, false=pause.
//     This is the only working "stop" lever in 3.8.7: there is NO close-/hide-preview-window message
//     (`set-preview-window-visible`'s handler is missing in this build), so stop = pause (window stays open).
//
// NOTE: `Editor` is the editor-process global (typed via @cocos/creator-types/editor). It is referenced ONLY
// inside these functions, never at module top level, so importing this module under vitest (Node) is safe.
Object.defineProperty(exports, "__esModule", { value: true });
exports.startPreview = startPreview;
exports.stopPreview = stopPreview;
const PKG = 'scene';
function request(pkg, message, ...args) {
    return Editor.Message.request(pkg, message, ...args);
}
async function startPreview() {
    await request(PKG, 'create-preview-window'); // open & run the preview window (no-op if already open)
    await request(PKG, 'editor-preview-set-play', true); // ensure playing (resumes if previously paused via stop)
    return { ok: true };
}
async function stopPreview() {
    await request(PKG, 'editor-preview-set-play', false); // pause the running preview (no close-window message in 3.8.7)
    return { ok: true };
}
