/**
 * Copy the Monaco editor assets out of node_modules and into public/monaco.
 *
 * `@monaco-editor/react` otherwise pulls the editor from a public CDN at runtime,
 * which breaks the app anywhere the CDN is unreachable (offline, locked-down
 * networks, CI) and pins a different version than the `monaco-editor` package we
 * actually depend on. Serving it ourselves keeps the whole app self-contained.
 *
 * The copy is generated, not committed — `npm run setup` regenerates it.
 */
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const src = join(dirname(require.resolve('monaco-editor/package.json')), 'min', 'vs');
const dest = join(root, 'public', 'monaco', 'vs');

if (!existsSync(src)) {
  console.error(`monaco assets not found at ${src} — is monaco-editor installed?`);
  process.exit(1);
}

rmSync(dest, { recursive: true, force: true });
mkdirSync(dirname(dest), { recursive: true });
cpSync(src, dest, { recursive: true });

const version = require('monaco-editor/package.json').version;
console.log(`Copied Monaco ${version} → public/monaco/vs`);
