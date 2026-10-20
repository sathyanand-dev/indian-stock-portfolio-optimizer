import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(__dirname, '..');

/**
 * Applies migrations once for the whole run. Doing this per test file made the
 * suites race each other for the SQLite write lock.
 */
export default function globalSetup() {
  execSync('npx prisma migrate deploy', {
    cwd: backendRoot,
    env: { ...process.env, DATABASE_URL: 'file:./test.db', NODE_ENV: 'test' },
    stdio: 'ignore',
  });
}
