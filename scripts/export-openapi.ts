// יוצר את docs/openapi.json מתוך src/docs/openapi.ts
import fs from 'node:fs';
import path from 'node:path';
import { openApiDocument } from '../src/docs/openapi';

const out = path.resolve('docs/openapi.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(openApiDocument, null, 2) + '\n');
console.log(`✅ נכתב ${path.relative(process.cwd(), out)}`);
