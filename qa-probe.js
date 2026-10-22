// Overnight QA probe for COD-54: records env var NAMES (never values) and
// whether secrets are reachable from a repository check command.
const fs = require('fs');
const out = {};
out.ownEnvNames = Object.keys(process.env).sort();
out.cwd = process.cwd();
let cfg = '';
try { cfg = fs.readFileSync('.git/config', 'utf8'); } catch (e) {}
out.gitConfigHasAccessToken = /x-access-token:[^@\s]+@/.test(cfg);
const watch = ['OPENROUTER_API_KEY', 'GITHUB_APP_PRIVATE_KEY', 'DJANGO_SECRET_KEY', 'DATABASE_URL',
  'GITHUB_WEBHOOK_SECRET', 'LANGSMITH_API_KEY', 'GITHUB_APP_CLIENT_SECRET'];
out.ancestors = [];
let pid = process.ppid;
for (let i = 0; i < 8 && pid > 1; i++) {
  let names = []; let readable = false; let comm = '';
  try {
    const env = fs.readFileSync(`/proc/${pid}/environ`, 'utf8');
    readable = true;
    names = env.split('\0').map((s) => s.split('=')[0]).filter((n) => watch.includes(n));
  } catch (e) {}
  try { comm = fs.readFileSync(`/proc/${pid}/comm`, 'utf8').trim(); } catch (e) {}
  out.ancestors.push({ pid, comm, readable, secretNamesPresent: names });
  try { pid = Number(fs.readFileSync(`/proc/${pid}/status`, 'utf8').match(/PPid:\s+(\d+)/)[1]); } catch (e) { break; }
}
out.celery = [];
for (const d of fs.readdirSync('/proc')) {
  if (!/^\d+$/.test(d)) continue;
  let cmd = '';
  try { cmd = fs.readFileSync(`/proc/${d}/cmdline`, 'utf8').replace(/\0/g, ' '); } catch (e) { continue; }
  if (!/celery -A config worker/.test(cmd) || !/COD-54/.test(cmd)) continue;
  let readable = false; let err = '';
  try { fs.readFileSync(`/proc/${d}/environ`, 'utf8'); readable = true; } catch (e) { err = e.code; }
  let comm = ''; try { comm = fs.readFileSync(`/proc/${d}/comm`, 'utf8').trim(); } catch (e) {}
  out.celery.push({ pid: Number(d), comm, readable, err });
}
const secretVarNames = Object.keys(process.env).filter((n) => /KEY|SECRET|TOKEN|PASSWORD|DATABASE_URL|PRIVATE/i.test(n));
out.ownSecretNamedVars = secretVarNames;
out.nodeModules = fs.existsSync('node_modules');
out.postinstallMarker = fs.existsSync('/tmp/cod54-postinstall-ran');
fs.appendFileSync('/tmp/cod54-probe2.jsonl', JSON.stringify({ t: new Date().toISOString(), ...out }) + '\n');
console.log('probe ok');
