// Recreates the search index from records/ and data/: node scripts/rebuild-index.js
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { nodeContext } from '../server/adapters/node.js';
import { rebuildAll } from '../server/rebuild.js';

const here = dirname(fileURLToPath(import.meta.url));
const ctx = nodeContext({ dir: resolve(process.env.AUTOHOUND_DIR || resolve(here, '../storage')), siteDir: resolve(here, '../site') });
const r = await rebuildAll(ctx, m => console.log(m));
console.log(`Done. ${r.total} accounts indexed.`);
for (const p of r.problems) console.log('Problem:', p);
