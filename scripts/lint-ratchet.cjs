#!/usr/bin/env node
/**
 * scripts/lint-ratchet.cjs
 *
 * Lint gate for a code base that starts with many lint errors: the count
 * per rule may go down, never up. lint-baseline.json holds the files to
 * lint, the rules left out (formatting, typing style) and the counts.
 *
 *   node scripts/lint-ratchet.cjs            check (CI): fails if a count went up
 *   node scripts/lint-ratchet.cjs --update   after fixing some: lower the baseline
 *   node scripts/lint-ratchet.cjs --init     first baseline (or after changing
 *                                           the rules / patterns): take today's counts
 */
const fs = require('fs');
const path = require('path');
const eslintApi = require('eslint');

const ROOT = path.join(__dirname, '..');
const BASELINE = path.join(ROOT, 'lint-baseline.json');

async function main() {
  const baseline = JSON.parse(fs.readFileSync(BASELINE, 'utf8'));
  const ignored = new Set(baseline.ignoredRules || []);
  // loadESLint picks flat config (eslint.config.*) on ESLint 8.57 and 9.
  const ESLint = eslintApi.loadESLint ? await eslintApi.loadESLint({ cwd: ROOT }) : eslintApi.ESLint;
  const eslint = new ESLint({ cwd: ROOT, fix: false });
  const results = await eslint.lintFiles(baseline.patterns);

  const counts = {};
  const where = {};
  for (const file of results) {
    for (const m of file.messages) {
      if (m.severity !== 2 || ignored.has(m.ruleId)) continue;
      const rule = m.ruleId || 'parse-error';
      counts[rule] = (counts[rule] || 0) + 1;
      (where[rule] ||= []).push(`${path.relative(ROOT, file.filePath)}:${m.line}`);
    }
  }

  if (process.argv.includes('--update') || process.argv.includes('--init')) {
    const raised = process.argv.includes('--init')
      ? []
      : Object.keys(counts).filter((r) => counts[r] > (baseline.counts[r] || 0));
    if (raised.length) {
      console.error(`Refusing to raise the baseline (${raised.join(', ')}): fix the new errors instead.`);
      process.exit(1);
    }
    baseline.counts = Object.fromEntries(Object.entries(counts).sort());
    fs.writeFileSync(BASELINE, JSON.stringify(baseline, null, 2) + '\n');
    console.log('lint-baseline.json updated:', baseline.counts);
    return;
  }

  let failed = false;
  const rules = new Set([...Object.keys(counts), ...Object.keys(baseline.counts)]);
  for (const rule of [...rules].sort()) {
    const now = counts[rule] || 0;
    const allowed = baseline.counts[rule] || 0;
    if (now > allowed) {
      failed = true;
      console.error(`✗ ${rule}: ${now} errors (baseline ${allowed}). Somewhere in:`);
      for (const at of where[rule].slice(0, 20)) console.error(`    ${at}`);
    } else if (now < allowed) {
      console.log(`✓ ${rule}: ${now} (baseline ${allowed}) — run with --update to lock in the progress`);
    }
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  console.log(`${total} lint errors counted (${[...ignored].join(', ') || 'no rule'} left out).`);
  if (failed) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
