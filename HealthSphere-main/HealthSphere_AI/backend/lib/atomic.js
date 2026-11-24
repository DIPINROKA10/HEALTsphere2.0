/* Small shared helper: atomic JSON file writes with a Windows-safe retry.
   Mirrors the hardened write-tmp-then-rename pattern used by db.js and
   research/store.js (rename can throw EPERM/EBUSY on Windows when another
   handle briefly holds the target; we retry, then fall back to a direct
   write rather than losing the data). */

import fs from 'node:fs';

export function readJsonSafe(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

export function atomicWriteJson(file, data) {
  const tmp = `${file}.tmp`;
  const json = JSON.stringify(data);
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      fs.writeFileSync(tmp, json);
      fs.renameSync(tmp, file);
      return true;
    } catch {
      /* retry */
    }
  }
  try { fs.writeFileSync(file, json); return true; } catch { return false; }
}
