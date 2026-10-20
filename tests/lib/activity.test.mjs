// The mentor roster's activity groups, and the heartbeat that feeds them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { activity, activityCounts, ACTIVE_NOW_MINUTES, ACTIVE_RECENT_MINUTES } from '../../assets/js/lib/format.js';

const NOW = Date.parse('2026-10-20T15:00:00Z');
const minutesAgo = (m) => new Date(NOW - m * 60000).toISOString();

test('activity groups players into now, the last hour, earlier, and never', () => {
  assert.deepEqual(activity(minutesAgo(0), NOW), { key: 'now', label: 'Active now' });
  assert.equal(activity(minutesAgo(ACTIVE_NOW_MINUTES), NOW).key, 'now');
  assert.deepEqual(activity(minutesAgo(ACTIVE_NOW_MINUTES + 1), NOW), { key: 'hour', label: `${ACTIVE_NOW_MINUTES + 1} min ago` });
  assert.equal(activity(minutesAgo(ACTIVE_RECENT_MINUTES), NOW).key, 'hour');
  assert.deepEqual(activity(minutesAgo(180), NOW), { key: 'earlier', label: '3 hr ago' });
  assert.deepEqual(activity(null, NOW), { key: 'never', label: 'Never' });
  assert.equal(activity(minutesAgo(-1), NOW).key, 'now', 'a server clock slightly ahead still reads as now');

  const rows = [minutesAgo(1), minutesAgo(3), minutesAgo(30), minutesAgo(600), null].map((t) => ({ last_active_at: t }));
  assert.deepEqual(activityCounts(rows, NOW), { total: 5, now: 2, hour: 3 });
});

test('a student on screen sends heartbeats often enough to stay active now', () => {
  const app = readFileSync(new URL('../../assets/js/app.js', import.meta.url), 'utf8');
  const m = app.match(/const HEARTBEAT_MS = ([\d\s*]+);/);
  assert.ok(m, 'app.js defines HEARTBEAT_MS');
  const beatMs = Function(`return ${m[1]}`)();
  // One missed beat (a slow network, a timer delayed by the browser) must not drop a student out of "now".
  assert.ok(2 * beatMs <= ACTIVE_NOW_MINUTES * 60000, `heartbeat every ${beatMs} ms is too slow for ${ACTIVE_NOW_MINUTES} minutes`);
});
