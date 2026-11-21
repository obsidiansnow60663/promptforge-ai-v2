import { createHash, randomBytes } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { cases, datasetVersion } from './cases.mjs';

const read = async path => JSON.parse(await readFile(path, 'utf8'));
const write = (path, value) => writeFile(path, JSON.stringify(value, null, 2) + '\n');
const hash = value => createHash('sha256').update(value).digest('hex');
const [mode, sourcePath, destination, referencePath] = process.argv.slice(2);
if (!referencePath || !['prepare', 'resolve'].includes(mode)) {
  throw Error('Gunakan prepare REPORT PACKET KEY atau resolve RATINGS RATINGS_FOR_RUNNER KEY.');
}

if (mode === 'prepare') {
  const bytes = await readFile(sourcePath);
  const report = JSON.parse(bytes);
  if (report.method !== 'provider requests' || report.datasetVersion !== datasetVersion ||
    report.datasetSha256 !== hash(JSON.stringify(cases))) throw Error('Laporan live dan versi dataset harus cocok.');
  const variants = ['direct-id', 'literal-en', 'promptforge'];
  const source = new Map(report.rows.map(row => [row.caseId + '/' + row.variant, row]));
  const salt = randomBytes(32).toString('hex');
  const items = [];
  const identities = {};
  for (const item of cases) {
    const rows = variants.map(variant => source.get(item.id + '/' + variant));
    if (!rows.every(row => row?.prompt && row.answer)) continue;
    const { id, category, source: instruction, intent, constraints, format, language, rubric, criticalFailures } = item;
    for (const row of rows) {
      const itemId = hash(salt + id + row.variant).slice(0, 16);
      identities[itemId] = { caseId: id, variant: row.variant };
      items.push({ itemId, category, instruction, intent, constraints, format, language, rubric,
        criticalFailures, prompt: row.prompt, answer: row.answer });
    }
  }
  if (!items.length) throw Error('Tidak ada kasus dengan jawaban dari ketiga jalur.');
  items.sort((a, b) => a.itemId.localeCompare(b.itemId));
  await write(destination, { datasetVersion, items });
  await write(referencePath, { datasetVersion, reportSha256: hash(bytes), identities });
  console.log(JSON.stringify({ reviewItems: items.length, matchedCases: items.length / variants.length }));
} else {
  const [ratings, reference] = await Promise.all([read(sourcePath), read(referencePath)]);
  if (ratings.datasetVersion !== datasetVersion || reference.datasetVersion !== datasetVersion ||
    !Array.isArray(ratings.reviews)) throw Error('Versi penilaian tidak cocok.');
  const used = new Set();
  const reviews = ratings.reviews.map(({ itemId, prompt, output, constraints, issues, critical }) => {
    if (typeof itemId !== 'string' || !Object.hasOwn(reference.identities, itemId) || used.has(itemId)) {
      throw Error('ID penilaian tidak dikenal atau terduplikasi.');
    }
    used.add(itemId);
    return { ...reference.identities[itemId], prompt, output, constraints, issues, critical };
  });
  await write(destination, { datasetVersion, reportSha256: reference.reportSha256, reviews });
}
