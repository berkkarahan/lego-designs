#!/usr/bin/env node
import * as fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bases = new Set(['printed', 'visual_estimate', 'user_confirmed', 'measured', 'unknown']);
const identities = new Set(['identified', 'inferred', 'unknown']);
const idOK = x => typeof x === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(x);
const positive = x => Number.isSafeInteger(x) && x > 0;
const nonempty = x => typeof x === 'string' && x.trim().length > 0;
const plain = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const err = message => { throw new Error(message); };
const assert = (ok, message) => { if (!ok) err(message); };
export const readJSON = async file => JSON.parse(await fs.readFile(file, 'utf8'));
const digest = value => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (plain(value)) return Object.fromEntries(Object.keys(value).sort().map(k => [k, canonical(value[k])]));
  return value;
}
function unique(rows, label) {
  assert(Array.isArray(rows), label + ' must be an array');
  const seen = new Set();
  for (const row of rows) {
    assert(plain(row) && idOK(row.id), label + ': invalid id');
    assert(!seen.has(row.id), label + ': duplicate id ' + row.id);
    seen.add(row.id);
  }
  return seen;
}
function sourceShape(source) {
  assert(nonempty(source.label), 'Source needs a label: ' + source.id);
  assert(['image', 'pdf', 'product', 'user'].includes(source.kind), 'Invalid source kind: ' + source.id);
  assert(source.path || source.url || source.kind === 'user', 'Source needs a path or URL: ' + source.id);
  if (source.path) assert(typeof source.path === 'string' && !path.isAbsolute(source.path) &&
    !/^[a-z]:/i.test(source.path) && !source.path.split(/[\\/]/).includes('..'), 'Source path must stay in the repo');
  if (source.url) {
    let url;
    try { url = new URL(source.url); } catch { err('Invalid source URL'); }
    assert(['http:', 'https:'].includes(url.protocol), 'Source URL must use HTTP(S)');
  }
  if (source.sha256) assert(/^[a-f0-9]{64}$/.test(source.sha256), 'Invalid source hash');
}
function partShape(part) {
  assert(nonempty(part.name) && nonempty(part.category), 'Part needs name and category');
  assert(identities.has(part.identity_status), 'Invalid identity_status: ' + part.id);
}
function evidenceShape(row, sources) {
  assert(row.quantity === null || positive(row.quantity), 'Quantity must be positive integer or null');
  assert(bases.has(row.quantity_basis), 'Invalid quantity_basis');
  assert((row.quantity === null) === (row.quantity_basis === 'unknown'), 'Unknown quantity must use unknown basis');
  assert(sources.has(row.source_id), 'Unknown evidence source: ' + row.source_id);
  assert(nonempty(row.location), 'Evidence needs a source location');
}
export function validateInventory(inv) {
  assert(plain(inv) && inv.schema_version === 1, 'Unsupported inventory schema_version');
  const sources = unique(inv.sources, 'sources');
  inv.sources.forEach(sourceShape);
  unique(inv.parts, 'parts');
  const imports = unique(inv.imports, 'imports');
  for (const receipt of inv.imports) {
    assert(positive(receipt.copies), 'Receipt needs positive copies');
    assert(/^[a-f0-9]{64}$/.test(receipt.manifest_hash), 'Receipt needs manifest hash');
    assert(Array.isArray(receipt.source_ids) && receipt.source_ids.every(id => sources.has(id)), 'Receipt has unknown source');
    assert(Array.isArray(receipt.changes) && receipt.changes.length > 0, 'Receipt needs changes');
  }
  for (const part of inv.parts) {
    partShape(part);
    assert(Array.isArray(part.lots) && part.lots.length > 0, 'Part needs evidence lots: ' + part.id);
    const seen = new Set();
    for (const lot of part.lots) {
      evidenceShape(lot, sources);
      assert(imports.has(lot.import_id), 'Unknown import receipt: ' + lot.import_id);
      assert(!seen.has(lot.import_id), 'Duplicate part lot in import: ' + part.id);
      seen.add(lot.import_id);
    }
  }
  for (const receipt of inv.imports) {
    const changes = receipt.changes.map(change => {
      assert(plain(change) && idOK(change.part_id), 'Invalid receipt change');
      const lot = inv.parts.find(p => p.id === change.part_id)?.lots.find(l => l.import_id === receipt.id);
      assert(lot && lot.quantity === change.quantity, 'Receipt and stock disagree: ' + receipt.id);
      assert(receipt.source_ids.includes(lot.source_id), 'Lot source missing from receipt');
      return change.part_id;
    });
    assert(new Set(changes).size === changes.length, 'Duplicate receipt change');
    const lots = inv.parts.filter(p => p.lots.some(l => l.import_id === receipt.id));
    assert(lots.length === changes.length, 'Receipt does not account for all lots');
  }
  return inv;
}
export function validateDesign(design, inv) {
  assert(plain(design) && design.schema_version === 1 && nonempty(design.name), 'Invalid design document');
  assert(Array.isArray(design.requirements) && design.requirements.length > 0, 'Design needs requirements');
  const ids = new Set(inv.parts.map(p => p.id));
  const codes = new Set();
  for (const row of design.requirements) {
    assert(nonempty(row.code) && !codes.has(row.code), 'Missing or duplicate design part code');
    codes.add(row.code);
    assert(nonempty(row.description) && positive(row.quantity), 'Invalid design requirement: ' + row.code);
    assert(['exact', 'tentative', 'unresolved'].includes(row.match_status), 'Invalid match_status');
    assert(row.part_id === null || ids.has(row.part_id), 'Unknown design part_id: ' + row.part_id);
    assert(row.part_id !== null || row.match_status === 'unresolved', 'Unmapped requirement must be unresolved');
    assert(row.part_id === null || row.match_status !== 'unresolved', 'Unresolved requirement must have null part_id');
    if (row.candidates) assert(Array.isArray(row.candidates) && row.candidates.every(id => ids.has(id)), 'Unknown candidate part');
  }
  return design;
}
export function summarize(part) {
  let known = 0, reliable = 0, unknown = false;
  for (const lot of part.lots) {
    if (lot.quantity === null) { unknown = true; continue; }
    known += lot.quantity;
    assert(Number.isSafeInteger(known), 'Stock quantity overflow');
    if (lot.quantity_basis !== 'visual_estimate') reliable += lot.quantity;
  }
  return { part_id: part.id, name: part.name, category: part.category,
    known_quantity: known, has_unknown_quantity: unknown, reliable_quantity: reliable,
    identity_status: part.identity_status, notes: part.notes || '' };
}
export function checkDesign(inv, design) {
  validateInventory(inv);
  validateDesign(design, inv);
  const groups = new Map();
  for (const row of design.requirements) {
    const key = row.part_id || 'unresolved:' + row.code;
    const group = groups.get(key) || { part_id: row.part_id, codes: [], description: row.description,
      required: 0, match_status: row.match_status, notes: [], candidates: row.candidates || [] };
    group.required += row.quantity;
    assert(Number.isSafeInteger(group.required), 'Requirement quantity overflow');
    group.codes.push(row.code);
    if (row.match_status !== 'exact') group.match_status = row.match_status;
    if (row.notes) group.notes.push(row.notes);
    groups.set(key, group);
  }
  const rows = [...groups.values()].map(group => {
    const part = inv.parts.find(p => p.id === group.part_id);
    const stock = part ? summarize(part) : null;
    // A tentative mapping cannot prove either sufficient stock or a definite shortage.
    const verifiedMatch = stock && group.match_status === 'exact' && stock.identity_status === 'identified';
    let status = 'needs_verification', missing = null;
    if (verifiedMatch) {
      if (stock.reliable_quantity >= group.required) { status = 'covered_by_recorded_stock'; missing = 0; }
      else if (!stock.has_unknown_quantity && stock.known_quantity === stock.reliable_quantity) {
        status = 'shortage'; missing = group.required - stock.known_quantity;
      }
    }
    return { ...group, owned_known: stock?.known_quantity ?? null,
      has_unknown_quantity: stock?.has_unknown_quantity ?? true, missing, status };
  });
  return { design: design.name,
    status: rows.some(r => r.status === 'shortage') ? 'shortage' :
      rows.some(r => r.status === 'needs_verification') ? 'needs_verification' : 'covered_by_recorded_stock',
    rows, stock_reserved: false };
}
export function applyManifest(current, manifest) {
  validateInventory(current);
  assert(plain(manifest) && manifest.schema_version === 1 && idOK(manifest.id), 'Invalid import manifest');
  assert(positive(manifest.copies), 'Import copies must be a positive integer');
  unique(manifest.sources, 'manifest sources');
  manifest.sources.forEach(sourceShape);
  assert(Array.isArray(manifest.items) && manifest.items.length > 0, 'Import needs items');
  const hash = digest(manifest);
  const prior = current.imports.find(r => r.id === manifest.id);
  if (prior) {
    assert(prior.manifest_hash === hash, 'Import ID already exists with different contents; use a new acquisition ID');
    return { inventory: current, receipt: prior, already_applied: true };
  }
  const next = structuredClone(current);
  for (const source of manifest.sources) {
    const priorSource = next.sources.find(s => s.id === source.id);
    if (priorSource) assert(isDeepStrictEqual(source, priorSource), 'Source ID conflicts with existing evidence: ' + source.id);
    else next.sources.push(source);
  }
  const sources = new Set(next.sources.map(s => s.id));
  const seen = new Set(), changes = [];
  for (const item of manifest.items) {
    assert(plain(item) && idOK(item.part_id) && !seen.has(item.part_id), 'Missing or duplicate import part_id');
    seen.add(item.part_id);
    evidenceShape(item, sources);
    let part = next.parts.find(p => p.id === item.part_id);
    if (part) assert(!item.part, 'Existing parts must use part_id only; do not overwrite their identity');
    else {
      assert(plain(item.part), 'New part requires metadata: ' + item.part_id);
      partShape(item.part);
      part = { id: item.part_id, name: item.part.name, category: item.part.category,
        identity_status: item.part.identity_status, notes: item.part.notes || '', lots: [] };
      next.parts.push(part);
    }
    const quantity = item.quantity === null ? null : item.quantity * manifest.copies;
    assert(quantity === null || positive(quantity), 'Quantity overflow');
    part.lots.push({ import_id: manifest.id, quantity, quantity_basis: item.quantity_basis,
      source_id: item.source_id, location: item.location, notes: item.notes || '' });
    changes.push({ part_id: item.part_id, quantity });
  }
  const receipt = { id: manifest.id, manifest_hash: hash, copies: manifest.copies,
    created_at: new Date().toISOString(), source_ids: [...new Set(manifest.items.map(i => i.source_id))],
    notes: manifest.notes || '', changes };
  next.imports.push(receipt);
  validateInventory(next);
  return { inventory: next, receipt, already_applied: false };
}
async function validateSources(inv, root) {
  const realRoot = await fs.realpath(root);
  for (const source of inv.sources) if (source.path) {
    const target = await fs.realpath(path.resolve(root, source.path));
    const relative = path.relative(realRoot, target);
    assert(relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative), 'Source escapes repo');
    if (source.sha256) {
      const actual = createHash('sha256').update(await fs.readFile(target)).digest('hex');
      assert(actual === source.sha256, 'Source hash mismatch: ' + source.id);
    }
  }
}
export async function importManifest(root, manifest, dryRun = false) {
  const dir = path.join(root, 'inventory');
  const file = path.join(dir, 'parts.json');
  const lockPath = path.join(dir, '.lock');
  let lock, temp;
  try {
    if (!dryRun) {
      lock = await fs.open(lockPath, 'wx');
      await lock.writeFile('Inventory import in progress. Remove only after confirming no import is running.\n');
    }
    const result = applyManifest(await readJSON(file), manifest);
    await validateSources(result.inventory, root);
    if (!dryRun && !result.already_applied) {
      temp = path.join(dir, '.' + randomUUID() + '.tmp');
      const handle = await fs.open(temp, 'wx');
      try { await handle.writeFile(JSON.stringify(result.inventory, null, 2) + '\n'); await handle.sync(); }
      finally { await handle.close(); }
      await fs.rename(temp, file);
      temp = undefined;
    }
    return { dry_run: dryRun, already_applied: result.already_applied, receipt: result.receipt };
  } finally {
    if (temp) await fs.unlink(temp).catch(() => {});
    if (lock) { await lock.close(); await fs.unlink(lockPath); }
  }
}
async function allDesigns(root) {
  const dir = path.join(root, 'designs');
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(e => { if (e.code === 'ENOENT') return []; throw e; });
  return entries.filter(e => e.isDirectory()).map(e => path.join(dir, e.name, 'parts.json'));
}
function human(value, command) {
  if (command === 'list') return value.parts.map(p => p.part_id + ' | ' + p.name + ' | ' +
    p.known_quantity + (p.has_unknown_quantity ? ' + unknown' : '') + ' recorded | ' +
    p.reliable_quantity + ' non-estimated | ' + p.identity_status + (p.notes ? ' | ' + p.notes : '')).join('\n');
  if (command === 'check') return value.design + ': ' + value.status + '\n' + value.rows.map(r =>
    r.codes.join('/') + ' | ' + r.description + ' | required ' + r.required + ' | recorded ' +
    (r.owned_known ?? '?') + (r.has_unknown_quantity ? ' + unknown' : '') + ' | missing ' + (r.missing ?? '?') + ' | ' + r.status).join('\n') +
    '\nStock was not reserved or changed.';
  return JSON.stringify(value, null, 2);
}
export async function main(argv = [], options = {}) {
  const root = options.root || ROOT;
  const out = options.stdout || (s => process.stdout.write(s + '\n'));
  const stderr = options.stderr || (s => process.stderr.write(s + '\n'));
  const args = argv.filter(a => !a.startsWith('--'));
  const command = args[0] || 'list';
  const json = argv.includes('--json');
  try {
    const allowed = new Set(['--json', ...(command === 'import' ? ['--dry-run'] : [])]);
    assert(argv.filter(a => a.startsWith('--')).every(a => allowed.has(a)), 'Unknown option');
    let result;
    if (command === 'help') {
      out('node tools/inventory.mjs [list [query] | validate [manifest.json] | check <design-folder> | import <manifest.json> [--dry-run]] [--json]');
      return 0;
    }
    if (command === 'import') {
      assert(args.length === 2, 'import needs a manifest path');
      result = await importManifest(root, await readJSON(path.resolve(root, args[1])), argv.includes('--dry-run'));
    } else {
      const inv = validateInventory(await readJSON(path.join(root, 'inventory', 'parts.json')));
      if (command === 'list') {
        const query = args.slice(1).join(' ').toLowerCase();
        result = { parts: inv.parts.map(summarize).filter(p => [p.part_id, p.name, p.category, p.notes].join(' ').toLowerCase().includes(query)) };
      } else if (command === 'check') {
        assert(args.length === 2, 'check needs a design folder');
        const folder = path.resolve(root, args[1]);
        result = checkDesign(inv, await readJSON(path.join(folder, 'parts.json')));
      } else if (command === 'validate') {
        assert(args.length <= 2, 'validate accepts at most one import manifest');
        await validateSources(inv, root);
        const files = await allDesigns(root);
        for (const file of files) validateDesign(await readJSON(file), inv);
        if (args[1]) {
          const preview = applyManifest(inv, await readJSON(path.resolve(root, args[1])));
          await validateSources(preview.inventory, root);
        }
        result = { valid: true, parts: inv.parts.length, designs: files.length, imports: inv.imports.length };
      } else err('Unknown command: ' + command);
    }
    out(json ? JSON.stringify(result, null, 2) : human(result, command));
    return command === 'check' ? (result.status === 'shortage' ? 1 : result.status === 'needs_verification' ? 3 : 0) : 0;
  } catch (e) {
    stderr(json ? JSON.stringify({ error: e.message }) : 'Error: ' + e.message);
    return 2;
  }
}
if (typeof process !== 'undefined' && process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  process.exitCode = await main(process.argv.slice(2));
