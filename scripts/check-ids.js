// Cross-checks that every getElementById(...) / querySelector('#id') in an
// HTML file's inline scripts actually resolves to an element in that file.
//
// Usage: node scripts/check-ids.js <file.html> [...]
const fs = require('fs');

const files = process.argv.slice(2);
if (!files.length) {
  console.error('Usage: node scripts/check-ids.js <file.html> [...]');
  process.exit(1);
}

let totalProblems = 0;

for (const file of files) {
  const html = fs.readFileSync(file, 'utf8');

  // Collect every id="..." in the document.
  const ids = new Set();
  const idRe = /\bid\s*=\s*["']([^"']+)["']/gi;
  let m;
  while ((m = idRe.exec(html)) !== null) ids.add(m[1]);

  // Collect ids referenced from inline scripts.
  const scriptBodies = [];
  const scriptRe = /<script([^>]*)>([\s\S]*?)<\/script>/gi;
  while ((m = scriptRe.exec(html)) !== null) {
    const attrs = m[1] || '';
    const body = m[2];
    if (/src=/i.test(attrs)) continue;
    if (/type=["']?text\/plain/i.test(attrs)) continue;
    scriptBodies.push(body);
  }
  const js = scriptBodies.join('\n');

  const referenced = new Set();
  const push = (id) => { if (id) referenced.add(id); };

  const getById = /getElementById\(\s*['"`]([^'"`$]+)['"`]\s*\)/g;
  while ((m = getById.exec(js)) !== null) push(m[1]);

  const queryId = /querySelector(?:All)?\(\s*['"`]#([A-Za-z0-9_-]+)/g;
  while ((m = queryId.exec(js)) !== null) push(m[1]);

  // The admin tab handler builds 'sec-' + tab.dataset.tab at runtime,
  // so the section ids cannot be found by a literal search. Collect the
  // tab names and check them separately.
  const tabRe = /data-tab=["']([^"']+)["']/g;
  const tabs = new Set();
  while ((m = tabRe.exec(html)) !== null) tabs.add(m[1]);

  const missing = [...referenced].filter((id) => !ids.has(id));

  // The tab handler builds 'sec-' + tab name at runtime, so check those too.
  const missingSections = [...tabs].filter((t) => !ids.has('sec-' + t));

  const problems = missing.length + missingSections.length;
  totalProblems += problems;

  console.log(`\n${file}: ${ids.size} ids, ${referenced.size} referenced`);
  if (missing.length) {
    console.log('  MISSING ids referenced by scripts:');
    for (const id of missing) console.log('    - ' + id);
  }
  if (missingSections.length) {
    console.log('  MISSING tab sections (sec-<tab>):');
    for (const s of missingSections) console.log('    - sec-' + s);
  }
  if (!problems) console.log('  all referenced ids exist');
}

console.log(totalProblems ? `\n${totalProblems} problem(s) found` : '\nno problems');
process.exit(totalProblems ? 1 : 0);
