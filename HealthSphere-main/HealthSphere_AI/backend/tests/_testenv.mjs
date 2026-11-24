// Must be imported FIRST in every test file so the shared JSON db
// is redirected into a throwaway temp directory.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

if (!process.env.HealthSphere_DATA_DIR) {
  const tmp = path.join(os.tmpdir(), `HealthSphere-test-${process.pid}-${Date.now()}`);
  fs.mkdirSync(tmp, { recursive: true });
  process.env.HealthSphere_DATA_DIR = tmp;
}

/* Never let a test touch a real Postgres database (db.js has an exit-time
   persist that could snapshot test-mutated state into a live DB).
   CI is the exception: when SUPABASE_DB_URL / DATABASE_URL is provided the
   integration tests intentionally run against that disposable database.
   Locally, force the JSON backend unless the caller explicitly opted in. */
if (!process.env.SUPABASE_DB_URL && !process.env.DATABASE_URL && !process.env.HealthSphere_STORAGE) {
  process.env.HealthSphere_STORAGE = 'json';
}
