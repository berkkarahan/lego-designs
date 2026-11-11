import * as fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export async function validateSkills(base = root) {
  const results = [];
  for (const name of ['design', 'inventory']) {
    const dir = path.join(base, '.agents', 'skills', name);
    const file = path.join(dir, 'SKILL.md');
    const content = await fs.readFile(file, 'utf8');
    const front = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
    if (!front) throw new Error(name + ': missing frontmatter');
    const declaredName = front[1].match(/^name:\s*([a-z0-9-]+)\s*$/m)?.[1];
    const encodedDescription = front[1].match(/^description:\s*("(?:\\.|[^"\\])*")\s*$/m)?.[1];
    if (declaredName !== name || !encodedDescription) throw new Error(name + ': invalid name/description');
    const description = JSON.parse(encodedDescription);
    if (!description.trim() || description.length > 1024 || !/use (when|for)/i.test(description))
      throw new Error(name + ': description must state use and stay within 1024 characters');
    if (content.split('\n').length > 500 || /TODO|FIXME|\[INSERT/i.test(content))
      throw new Error(name + ': unfinished or oversized skill');
    for (const match of content.matchAll(/\]\(([^)]+)\)/g)) {
      const target = path.resolve(dir, match[1]);
      await fs.access(target);
    }
    const refs = await fs.readdir(path.join(dir, 'references'));
    for (const ref of refs) if (!content.includes('references/' + ref)) throw new Error('Unlinked reference: ' + ref);
    results.push({ name, description_characters: description.length, references: refs.length });
  }
  return results;
}
if (typeof process !== 'undefined' && process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { console.log(JSON.stringify(await validateSkills(), null, 2)); }
  catch (e) { console.error(e.message); process.exitCode = 1; }
}
