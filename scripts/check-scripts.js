// Extracts inline <script> blocks from an HTML file and syntax-checks each one.
const fs = require('fs');
const { execFileSync } = require('child_process');
const os = require('os');
const path = require('path');

const file = process.argv[2];
const html = fs.readFileSync(file, 'utf8');
const re = /<script([^>]*)>([\s\S]*?)<\/script>/gi;
let m, i = 0, bad = 0;

while ((m = re.exec(html)) !== null) {
  const attrs = m[1] || '';
  const body = m[2];
  if (!body.trim()) continue;
  if (/src=/i.test(attrs)) continue;
  // skip non-JS blocks (e.g. <script type="text/plain" id="previewData">)
  const typeMatch = attrs.match(/type=["']?([^"'\s>]+)/i);
  if (typeMatch && !/^(module|text\/javascript|application\/javascript|javascript)$/i.test(typeMatch[1])) continue;
  const isModule = /type=["']?module/i.test(attrs);
  const ext = isModule ? '.mjs' : '.js';
  const tmp = path.join(os.tmpdir(), `chk_${process.pid}_${i++}${ext}`);
  fs.writeFileSync(tmp, body);
  try {
    execFileSync(process.execPath, ['--check', tmp], { stdio: 'pipe' });
    console.log(`  script #${i - 1} (${isModule ? 'module' : 'classic'}) OK`);
  } catch (e) {
    bad++;
    console.log(`  script #${i - 1} (${isModule ? 'module' : 'classic'}) SYNTAX ERROR`);
    console.log(String(e.stderr).split('\n').slice(0, 12).join('\n'));
  } finally {
    fs.unlinkSync(tmp);
  }
}
console.log(bad ? `\n${file}: ${bad} script(s) with errors` : `\n${file}: all scripts OK`);
process.exit(bad ? 1 : 0);
