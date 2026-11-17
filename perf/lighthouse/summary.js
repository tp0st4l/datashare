// Lit les rapports JSON et affiche, pour chaque page et appareil, le passage au score médian
const fs = require('fs');

const groups = {};
for (const file of fs.readdirSync('/audits').filter((f) => f.endsWith('.report.json'))) {
    const key = file.replace(/-\d+\.report\.json$/, '');
    (groups[key] ??= []).push(JSON.parse(fs.readFileSync(`/audits/${file}`, 'utf8')));
}

const score = (category) => Math.round(category.score * 100);

console.log('page-appareil | perf | access. | bonnes pr. | FCP | LCP | TBT | CLS');
for (const [key, reports] of Object.entries(groups).sort()) {
    reports.sort((a, b) => a.categories.performance.score - b.categories.performance.score);
    const median = reports[Math.floor(reports.length / 2)];
    const { categories: c, audits: a } = median;
    console.log([
        key,
        score(c.performance),
        score(c.accessibility),
        score(c['best-practices']),
        a['first-contentful-paint'].displayValue,
        a['largest-contentful-paint'].displayValue,
        a['total-blocking-time'].displayValue,
        a['cumulative-layout-shift'].displayValue,
    ].join(' | '));
}