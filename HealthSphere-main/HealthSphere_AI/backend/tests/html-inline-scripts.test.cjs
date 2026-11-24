/* Every inline <script> block in the frontend HTML must parse as JavaScript.
   Regression guard: a stray '<script>' tag once got pasted inside the boot
   block. Because browsers parse a whole script before executing it, that one
   token silently killed the entire block — APP_VERSION, the Clarity snippet
   and the window.onerror boot-error overlay all died with it, while every
   external script kept loading and the app still "worked". */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert');

const htmlPath = path.join(__dirname, '..', '..', 'frontend', 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');

const blocks = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];
assert.ok(blocks.length >= 1, 'inline script blocks present');

blocks.forEach((b, i) => {
  assert.ok(!/<\s*script/i.test(b[1]), `inline block ${i + 1}: must not contain a nested <script> token`);
  assert.doesNotThrow(() => new Function(b[1]), `inline block ${i + 1}: must parse as JavaScript`);
});

const open = (html.match(/<script\b/gi) || []).length;
const close = (html.match(/<\/script>/gi) || []).length;
assert.strictEqual(open, close, `<script> (${open}) and </script> (${close}) tags must balance`);

console.log(`[PASS] html-inline-scripts.test.cjs — ${blocks.length} inline block(s) parse, ${open} script tags balanced`);
