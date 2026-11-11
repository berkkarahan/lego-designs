import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import * as syncFS from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { applyManifest, checkDesign, importManifest, main, summarize, validateInventory, validateDesign } from '../tools/inventory.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = {id:'test-evidence',label:'Counted stock',kind:'user'};
const empty = () => ({schema_version:1,sources:[],parts:[],imports:[]});
function manifest(id='test-kit', copies=1, quantity=4, basis='user_confirmed', identity='identified') {
  return {schema_version:1,id,copies,sources:[source],notes:'Test fixture',items:[{
    part_id:'test-pin',part:{name:'Measured test pin',category:'pins',identity_status:identity},
    quantity,quantity_basis:basis,source_id:source.id,location:'User counted test pins'
  }]};
}
const inv = () => applyManifest(empty(), manifest()).inventory;
const req = (code,quantity,extra={}) => ({code,quantity,description:'Measured test pin',part_id:'test-pin',match_status:'exact',...extra});
const design = (...requirements) => ({schema_version:1,name:'Test model',requirements});
async function fixture(fn) {
  await fs.mkdir(path.join(ROOT,'.tmp'),{recursive:true});
  const dir = path.join(ROOT,'.tmp','inventory-test-' + randomUUID());
  await fs.mkdir(dir);
  try {
    await fs.mkdir(path.join(dir,'inventory'));
    await fs.writeFile(path.join(dir,'inventory','parts.json'),JSON.stringify(inv()));
    return await fn(dir);
  } finally {
    const relative=path.relative(path.join(ROOT,'.tmp'),dir);
    assert(!relative.startsWith('..') && !path.isAbsolute(relative));
    await fs.rm(dir,{recursive:true,force:true});
  }
}
test('unit: aggregate repeated stock requirements before reporting exact shortage',()=>{
  const checked=checkDesign(inv(),design(req('P1',3),req('P2',3)));
  assert.equal(checked.status,'shortage');
  assert.equal(checked.rows.length,1);
  assert.equal(checked.rows[0].missing,2);
  for(const count of [1,4]) assert.equal(checkDesign(inv(),design(req('P',count))).status,'covered_by_recorded_stock');
});
test('unit: uncertainty cannot prove coverage or a shortage',()=>{
  for(const [qty,basis,identity,match] of [
    [null,'unknown','identified','exact'],[2,'visual_estimate','identified','exact'],
    [100,'printed','inferred','exact'],[2,'printed','identified','tentative']
  ]) {
    const stock=applyManifest(empty(),manifest('kit',1,qty,basis,identity)).inventory;
    const result=checkDesign(stock,design(req('P',6,{match_status:match})));
    assert.equal(result.status,'needs_verification');
    assert.equal(result.rows[0].missing,null);
  }
  const unresolved=checkDesign(inv(),design(req('AX',2,{part_id:null,match_status:'unresolved',candidates:['test-pin']})));
  assert.equal(unresolved.rows[0].owned_known,null);
});
test('unit: sufficient reliable lots cover requirements despite unknown additional stock',()=>{
  const stock=inv();
  const more=manifest('more',1,null,'unknown');delete more.items[0].part;
  const combined=applyManifest(stock,more).inventory;
  assert.equal(checkDesign(combined,design(req('P',4))).status,'covered_by_recorded_stock');
  assert.equal(checkDesign(combined,design(req('P',5))).status,'needs_verification');
  assert.equal(summarize(combined.parts[0]).known_quantity,4);
});
test('unit: shortage has overall precedence without discarding unresolved requirements',()=>{
  const result=checkDesign(inv(),design(req('P',9),req('A',2,{part_id:null,match_status:'unresolved'})));
  assert.equal(result.status,'shortage');
  assert.deepEqual(result.rows.map(r=>r.status),['shortage','needs_verification']);
});
test('unit: copy multiplication, unknown counts and receipt identity are consistent',()=>{
  const initial=applyManifest(empty(),manifest('kit',3));
  assert.equal(summarize(initial.inventory.parts[0]).known_quantity,12);
  const replay=applyManifest(initial.inventory,JSON.parse(JSON.stringify(manifest('kit',3))));
  assert.equal(replay.already_applied,true);
  assert.deepEqual(replay.inventory,initial.inventory);
  assert.throws(()=>applyManifest(initial.inventory,manifest('kit',2)),/different contents/);
  const more=manifest('purchase-two',2);delete more.items[0].part;
  const combined=applyManifest(initial.inventory,more);
  assert.equal(summarize(combined.inventory.parts[0]).known_quantity,20);
  const unknown=applyManifest(empty(),manifest('assorted',5,null,'unknown'));
  assert.equal(unknown.inventory.parts[0].lots[0].quantity,null);
});
test('unit: malformed records, duplicate IDs, invalid quantities and receipt drift fail',()=>{
  const samples=[
    stock=>stock.parts.push(structuredClone(stock.parts[0])),
    stock=>stock.parts[0].lots[0].quantity=-1,
    stock=>stock.parts[0].lots[0].source_id='missing',
    stock=>stock.parts[0].lots[0].import_id='missing',
    stock=>stock.imports[0].changes[0].quantity=8
  ];
  for(const mutate of samples) {const stock=inv();mutate(stock);assert.throws(()=>validateInventory(stock));}
  const stock=inv();
  assert.throws(()=>validateDesign(design(req('P',1),req('P',2)),stock),/duplicate/);
  assert.throws(()=>validateDesign(design(req('P',1,{part_id:'missing'})),stock),/Unknown/);
  assert.throws(()=>validateDesign(design(req('P',0)),stock),/Invalid/);
  assert.throws(()=>validateDesign(design(req('P',1,{part_id:null})),stock),/Unmapped/);
  const overflow=manifest('overflow',Number.MAX_SAFE_INTEGER,2);
  assert.throws(()=>applyManifest(empty(),overflow),/overflow/);
});
test('unit: source conflicts, duplicate manifest items and metadata overwrites fail',()=>{
  const stock=inv(), before=structuredClone(stock);
  const conflict=manifest('conflict');delete conflict.items[0].part;
  conflict.sources[0]={...source,label:'Contradictory evidence'};
  assert.throws(()=>applyManifest(stock,conflict),/conflicts/);
  const duplicate=manifest('duplicate');duplicate.items.push(structuredClone(duplicate.items[0]));
  assert.throws(()=>applyManifest(empty(),duplicate),/duplicate/);
  assert.throws(()=>applyManifest(stock,manifest('overwrite')),/must use part_id/);
  assert.deepEqual(stock,before);
});
test('integration: dry run, invalid imports and repeat imports preserve committed stock',async()=>{
  await fixture(async root=>{
    const file=path.join(root,'inventory','parts.json'),before=await fs.readFile(file,'utf8');
    const next=manifest('another',2);delete next.items[0].part;
    const preview=await importManifest(root,next,true);
    assert.equal(preview.receipt.changes[0].quantity,8);
    assert.equal(await fs.readFile(file,'utf8'),before);
    const invalid=structuredClone(next);invalid.items[0].quantity=-5;
    await assert.rejects(importManifest(root,invalid));
    assert.equal(await fs.readFile(file,'utf8'),before);
    await importManifest(root,next);
    const after=await fs.readFile(file,'utf8');
    assert.equal(summarize(JSON.parse(after).parts[0]).known_quantity,12);
    assert.equal((await importManifest(root,next)).already_applied,true);
    assert.equal(await fs.readFile(file,'utf8'),after);
    await assert.rejects(fs.access(path.join(root,'inventory','.lock')));
  });
});
test('integration: evidence integrity and path containment fail before commit',async()=>{
  await fixture(async root=>{
    const file=path.join(root,'inventory','parts.json'),before=await fs.readFile(file,'utf8');
    await fs.writeFile(path.join(root,'evidence.txt'),'counted four');
    const next=manifest('bad-evidence');delete next.items[0].part;
    next.sources=[{...source,id:'new-evidence',path:'evidence.txt',sha256:'0'.repeat(64)}];
    next.items[0].source_id='new-evidence';
    await assert.rejects(importManifest(root,next),/hash mismatch/);
    next.sources[0].path='../outside.txt';
    await assert.rejects(importManifest(root,next),/stay in the repo/);
    assert.equal(await fs.readFile(file,'utf8'),before);
  });
});
test('integration: concurrent lock refuses import without disturbing the existing lock',async()=>{
  await fixture(async root=>{
    const lock=path.join(root,'inventory','.lock');
    await fs.writeFile(lock,'another importer');
    const next=manifest('next');delete next.items[0].part;
    await assert.rejects(importManifest(root,next),{code:'EEXIST'});
    assert.equal(await fs.readFile(lock,'utf8'),'another importer');
    await fs.unlink(lock);
  });
});
test('integration: real repository assets, saved comparison and required totals stay consistent',async()=>{
  const outputs=[],errors=[];
  assert.equal(await main(['validate','--json'],{root:ROOT,stdout:s=>outputs.push(s),stderr:s=>errors.push(s)}),0);
  assert.equal(errors.length,0);
  const stock=JSON.parse(await fs.readFile(path.join(ROOT,'inventory','parts.json'),'utf8'));
  const parts=JSON.parse(await fs.readFile(path.join(ROOT,'designs','mini-palet-r1','parts.json'),'utf8'));
  const saved=JSON.parse(await fs.readFile(path.join(ROOT,'designs','mini-palet-r1','inventory-check.json'),'utf8'));
  assert.equal(parts.requirements.length,17);
  assert.equal(parts.requirements.reduce((n,r)=>n+r.quantity,0),97);
  assert.deepEqual(saved,checkDesign(stock,parts));
  assert.equal(saved.rows.filter(r=>r.status==='covered_by_recorded_stock').length,2);
  assert.equal(saved.rows.find(r=>r.codes.includes('A12')).status,'needs_verification');
});
test('e2e: executable CLI queries, stock checks, imports and errors',async()=>{
  await fixture(async root=>{
    await fs.mkdir(path.join(root,'tools'));
    await fs.copyFile(path.join(ROOT,'tools','inventory.mjs'),path.join(root,'tools','inventory.mjs'));
    const run=(...args)=>{
      const stdoutFile=path.join(root,'stdout.txt'),stderrFile=path.join(root,'stderr.txt');
      const out=syncFS.openSync(stdoutFile,'w'),err=syncFS.openSync(stderrFile,'w');
      let result;
      try { result=spawnSync(process.execPath,[path.join(root,'tools','inventory.mjs'),...args],
        {cwd:root,stdio:['inherit',out,err]}); }
      finally { syncFS.closeSync(out);syncFS.closeSync(err); }
      return {...result,stdout:syncFS.readFileSync(stdoutFile,'utf8'),stderr:syncFS.readFileSync(stderrFile,'utf8')};
    };
    let result=run('list','pins','--json');
    assert.equal(result.status,0,result.error?.message || result.stderr);
    assert.equal(JSON.parse(result.stdout).parts.length,1);
    result=run('list','motors','--json');
    assert.equal(JSON.parse(result.stdout).parts.length,0);
    await fs.mkdir(path.join(root,'designs','model'),{recursive:true});
    const partsFile=path.join(root,'designs','model','parts.json');
    const stockFile=path.join(root,'inventory','parts.json');
    const original=await fs.readFile(stockFile,'utf8');
    for(const [requirement,expected] of [[req('P',4),0],[req('P',5),1],[req('P',4,{match_status:'tentative'}),3]]) {
      await fs.writeFile(partsFile,JSON.stringify(design(requirement)));
      result=run('check','designs/model','--json');
      assert.equal(result.status,expected,result.stderr);
      assert.equal(JSON.parse(result.stdout).stock_reserved,false);
    }
    assert.equal(await fs.readFile(stockFile,'utf8'),original);
    const next=manifest('e2e-purchase',2);delete next.items[0].part;
    await fs.writeFile(path.join(root,'purchase.json'),JSON.stringify(next));
    result=run('import','purchase.json','--dry-run','--json');
    assert.equal(result.status,0,result.stderr);
    assert.equal(await fs.readFile(stockFile,'utf8'),original);
    result=run('import','purchase.json','--json');
    assert.equal(result.status,0,result.stderr);
    result=run('import','purchase.json','--json');
    assert.equal(JSON.parse(result.stdout).already_applied,true);
    assert.equal(run('validate').status,0);
    for(const args of [['check'],['check','missing'],['wat'],['list','--wat'],['import','missing.json']]) {
      result=run(...args,'--json');
      assert.equal(result.status,2);
      assert.ok(JSON.parse(result.stderr).error);
    }
  });
});
