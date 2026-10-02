// Regenerates src/lib/passwords/top.json from Hanayo's generated top-passwords list.
//   bun scripts/passwords.mjs <path to top_passwords.go>
import { readFileSync, writeFileSync } from 'node:fs';

const source = readFileSync(process.argv[2], 'utf8');
const list = [...source.matchAll(/^\s*("(?:[^"\\]|\\.)*"),?\s*$/gm)].map((m) => JSON.parse(m[1]));
writeFileSync('apps/web/src/lib/passwords/top.json', JSON.stringify(list));
console.log(`${list.length} passwords`);
