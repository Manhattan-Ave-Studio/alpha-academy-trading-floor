// Exam tries and required lessons: the helpers the views use, and the constants that must
// match the database, which is the referee.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  EXAM_TRIES, PASS_MARK, lessonById, isPassed, triesUsed, triesLeft, examLocked, requiredLeft, requiredUnknown, tradingLocked
} from '../../assets/js/data/lessons.js';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

// An entry saved before tries existed has no attempts and counts as one try.
const legacy = { score: 60, completed_at: '2026-10-01T15:00:00Z' };
const entry = (attempts, score = 60) => ({ score, completed_at: '2026-10-20T15:00:00Z', attempts });

test('tries used and tries left, counting an entry saved before tries existed as one', () => {
  assert.equal(EXAM_TRIES, 3);
  assert.equal(triesUsed(undefined), 0);
  assert.equal(triesUsed(null), 0);
  assert.equal(triesUsed(legacy), 1);
  assert.equal(triesUsed(entry(0)), 0, 'after an admin reset');
  assert.equal(triesUsed(entry(2)), 2);
  assert.equal(triesUsed({ score: 50, attempts: '2' }), 2, 'a count that arrives as text still counts');
  assert.equal(triesLeft(undefined), 3);
  assert.equal(triesLeft(legacy), 2);
  assert.equal(triesLeft(entry(2)), 1);
  assert.equal(triesLeft(entry(3)), 0);
  assert.equal(triesLeft(entry(7)), 0, 'never negative');
});

test('an exam locks after the last failing try and never after a pass', () => {
  assert.equal(examLocked(undefined), false);
  assert.equal(examLocked(null), false);
  assert.equal(examLocked(legacy), false);
  assert.equal(examLocked(entry(2)), false);
  assert.equal(examLocked(entry(3)), true);
  assert.equal(examLocked(entry(4)), true);
  assert.equal(examLocked(entry(0)), false, 'a reset opens it again');
  assert.equal(examLocked(entry(3, 75)), false, 'passed on the last try');
  assert.equal(examLocked(entry(3, 88)), false);
  assert.equal(isPassed(entry(3, 74)), false);
  assert.equal(isPassed({ score: '80' }), true, 'a score that arrives as text still passes');
});

test('required lessons left are real lessons the student has not passed, in the order assigned', () => {
  const ids = ['order-types', 'what-is-a-stock', 'researching-a-company'];
  for (const id of ids) assert.ok(lessonById(id), `${id} is a real lesson`);
  const left = (required, progress) => requiredLeft(required, progress).map((l) => l.id);
  assert.deepEqual(left(ids, {}), ids);
  assert.deepEqual(left(ids, undefined), ids, 'no progress yet');
  assert.deepEqual(left(ids, { 'what-is-a-stock': entry(1, 75) }), ['order-types', 'researching-a-company']);
  assert.deepEqual(left(ids, { 'what-is-a-stock': entry(3, 74) }), ids, 'a near miss does not count, even with no tries left');
  assert.deepEqual(left(ids, { 'order-types': legacy, 'what-is-a-stock': { score: 100 } }), ['order-types', 'researching-a-company']);
  assert.deepEqual(left(['no-such-lesson', 'order-types'], {}), ['order-types'], 'an id that is no longer a lesson is skipped');
  assert.deepEqual(left(undefined, {}), []);
  assert.deepEqual(left(null, {}), []);
  assert.deepEqual(left([], undefined), []);
  assert.equal(requiredLeft(['order-types'], {})[0].title, lessonById('order-types').title, 'lesson objects, so views can show titles');
});

test('trading locks only while a required lesson is unpassed', () => {
  assert.equal(tradingLocked(null, {}), false);
  assert.equal(tradingLocked(undefined, undefined), false);
  assert.equal(tradingLocked({}, {}), false, 'a game saved before required lessons existed');
  assert.equal(tradingLocked({ required_lessons: [] }, {}), false);
  assert.equal(tradingLocked({ required_lessons: ['order-types'] }, {}), true);
  assert.equal(tradingLocked({ required_lessons: ['order-types'] }, undefined), true);
  assert.equal(tradingLocked({ required_lessons: ['order-types'] }, { 'order-types': entry(3, 74) }), true, 'locked out of the exam and out of trading');
  assert.equal(tradingLocked({ required_lessons: ['order-types'] }, { 'order-types': entry(2, 75) }), false);
  assert.equal(tradingLocked({ required_lessons: ['order-types'] }, { 'order-types': { score: 80 } }), false, 'a pass saved before tries existed still counts');
  assert.equal(tradingLocked({ required_lessons: ['order-types', 'what-is-a-stock'] }, { 'order-types': { score: 80 } }), true, 'every required lesson must be passed');
  assert.equal(tradingLocked({ required_lessons: ['no-such-lesson'] }, {}), true, 'an id with no lesson still locks, as private.lessons_left does, until an admin saves the list again');
  assert.deepEqual(requiredUnknown(['no-such-lesson', 'order-types']), ['no-such-lesson']);
});

test('EXAM_TRIES and PASS_MARK match the database and the demo', () => {
  const modules = read('../../supabase/migrations/20261021000100_modules_and_admins.sql');
  const people = read('../../supabase/migrations/20261011000400_people.sql');
  const engine = read('../../assets/js/engine/trading.js');
  const demo = read('../../assets/js/api/demo.js');

  assert.ok(modules.includes(`lp.attempts >= ${EXAM_TRIES}`), 'complete_lesson allows the same number of tries');
  assert.ok(modules.includes(`You have used all ${EXAM_TRIES} tries for this exam. Ask a mentor to reset it.`), 'and tells the student so');
  assert.match(
    demo,
    new RegExp(`You have used all (\\$\\{EXAM_TRIES\\}|${EXAM_TRIES}) tries for this exam\\. Ask a mentor to reset it\\.`),
    'the demo uses the same wording'
  );
  for (const [name, sql] of [['people', people], ['modules', modules]]) {
    const marks = [...sql.matchAll(/\.score >= (\d+)/g)].map((m) => Number(m[1]));
    assert.ok(marks.length > 0, `the ${name} migration checks the pass mark`);
    assert.deepEqual(new Set(marks), new Set([PASS_MARK]), `the ${name} migration uses PASS_MARK (${PASS_MARK}) everywhere`);
  }
  const lockedMessage = 'Finish your required lessons before trading. Open Learn to see what is left.';
  assert.ok(modules.includes(`raise exception '${lockedMessage}'`), 'place_order refuses with the lessons message');
  assert.ok(engine.includes(`OrderError('${lockedMessage}')`), 'the demo engine uses the database wording');
});
