import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const localPython=path.join(root,'.venv',process.platform==='win32'?'Scripts/python.exe':'bin/python');
const python=process.env.PYTHON || (fs.existsSync(localPython)?localPython:'python');
const commands=[
  [process.execPath,['tests/inventory.test.mjs']],
  [python,['-m','unittest','discover','-s','tests','-p','test_guide.py','-v']],
  [process.execPath,['tools/validate-skills.mjs']]
];
let failed=false;
for(const [command,args] of commands) {
  console.log('\nRunning '+path.basename(command)+' '+args.join(' '));
  const result=spawnSync(command,args,{cwd:root,stdio:'inherit'});
  if(result.error) console.error(result.error.message);
  if(result.status!==0) failed=true;
}
process.exitCode=failed?1:0;
