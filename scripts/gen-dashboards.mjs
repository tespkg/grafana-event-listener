// Generates local test dashboards for the event-listener-panel into
// provisioning/dashboards/json/. Each dashboard embeds the event-listener-panel
// (the postMessage bridge) plus template variables so setVariable/navigate from
// the parent are observable in the URL. Run: node scripts/gen-dashboards.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'provisioning', 'dashboards', 'json');
mkdirSync(outDir, { recursive: true });

const DS = { type: 'grafana-testdata-datasource', uid: 'testdata' };

const templating = () => ({
  list: [
    {
      name: 'treequery',
      type: 'textbox',
      label: 'Tree query',
      query: '',
      current: { text: '', value: '' },
      options: [{ text: '', value: '', selected: true }],
    },
    {
      name: 'years',
      type: 'custom',
      label: 'Year',
      query: '2023,2024,2025,2026',
      current: { text: '2026', value: '2026' },
      options: ['2023', '2024', '2025', '2026'].map((v) => ({
        text: v,
        value: v,
        selected: v === '2026',
      })),
    },
    {
      name: 'months',
      type: 'custom',
      label: 'Month',
      includeAll: true,
      allValue: '$__all',
      multi: true,
      query: 'JAN,FEB,MAR,APR,MAY,JUN,JUL,AUG,SEP,OCT,NOV,DEC',
      current: { text: 'All', value: ['$__all'] },
      options: [
        { text: 'All', value: '$__all', selected: true },
        ...'JAN,FEB,MAR,APR,MAY,JUN,JUL,AUG,SEP,OCT,NOV,DEC'
          .split(',')
          .map((v) => ({ text: v, value: v, selected: false })),
      ],
    },
    {
      name: 'view',
      type: 'custom',
      label: 'View',
      query: 'summary,detail',
      current: { text: 'summary', value: 'summary' },
      options: [
        { text: 'summary', value: 'summary', selected: true },
        { text: 'detail', value: 'detail', selected: false },
      ],
    },
  ],
});

const panels = (title) => [
  {
    id: 1,
    type: 'event-listener-panel',
    title: 'Event Listener (bridge)',
    gridPos: { h: 3, w: 6, x: 0, y: 0 },
    options: {},
  },
  {
    id: 2,
    type: 'text',
    title: 'Current variables',
    gridPos: { h: 3, w: 18, x: 6, y: 0 },
    options: {
      mode: 'markdown',
      content:
        `### ${title}\n` +
        '- **treequery**: `${treequery}`\n' +
        '- **years**: `${years}`  **months**: `${months}`  **view**: `${view}`',
    },
  },
  {
    id: 3,
    type: 'timeseries',
    title: 'Random walk (testdata)',
    datasource: DS,
    gridPos: { h: 9, w: 24, x: 0, y: 3 },
    fieldConfig: { defaults: {}, overrides: [] },
    options: {},
    targets: [
      { refId: 'A', datasource: DS, scenarioId: 'random_walk', seriesCount: 2 },
    ],
  },
];

const dashboard = (uid, title) => ({
  uid,
  title,
  tags: ['test', 'event-listener'],
  timezone: '',
  schemaVersion: 39,
  version: 1,
  editable: true,
  time: { from: 'now-6h', to: 'now' },
  templating: templating(),
  panels: panels(title),
});

// uid -> title. UIDs match test-harness.html (local preset).
const DASHBOARDS = {
  'local-daily': 'Daily Production (local)',
  'local-wpb-exp': 'Work Program — Expenditure (local)',
  'local-wpb-wells': 'Work Program — Wells (local)',
  'local-wpb-prod': 'Work Program — Production (local)',
  'local-ng': 'Natural Gas NG (local)',
  'local-ng-reports': 'Natural Gas Reports (local)',
};

for (const [uid, title] of Object.entries(DASHBOARDS)) {
  const file = join(outDir, `${uid}.json`);
  writeFileSync(file, JSON.stringify(dashboard(uid, title), null, 2) + '\n');
  console.log('wrote', file);
}
console.log(`\n${Object.keys(DASHBOARDS).length} dashboards generated.`);
