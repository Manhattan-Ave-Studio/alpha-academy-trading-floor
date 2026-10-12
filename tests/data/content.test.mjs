// Content checks for lessons, exams, the glossary, and resources.
// These catch the mistakes that are easy to make while editing copy: a broken exam answer,
// a missing glossary term, an unbalanced tag, a dash the style guide avoids.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LESSONS, TRACKS, PASS_MARK, correctToPass } from '../../assets/js/data/lessons.js';
import { GLOSSARY } from '../../assets/js/data/glossary.js';
import { RESOURCE_GROUPS, BOOKS } from '../../assets/js/data/resources.js';

const DASHES = /[–—]/;

function allText(lesson) {
  return [
    lesson.title, lesson.summary, ...lesson.goals, ...lesson.takeaways, ...(lesson.discuss || []),
    ...lesson.sections.flatMap((s) => [s.title, s.html]),
    ...lesson.exam.flatMap((q) => [q.q, q.explain, ...q.choices]),
    ...lesson.videos.map((v) => v.title),
    ...lesson.links.map((l) => l.title)
  ].join('\n');
}

test('21 lessons with unique ids, in known tracks', () => {
  assert.equal(LESSONS.length, 21);
  assert.equal(new Set(LESSONS.map((l) => l.id)).size, LESSONS.length);
  for (const l of LESSONS) {
    assert.match(l.id, /^[a-z0-9-]{1,64}$/, `${l.id}: ids must fit the complete_lesson check`);
    assert.ok(TRACKS.some((t) => t.id === l.track), `${l.id}: unknown track ${l.track}`);
    assert.ok(l.minutes >= 4 && l.minutes <= 15, `${l.id}: reading time ${l.minutes}`);
  }
});

test('every lesson has goals, sections, takeaways, and discussion prompts', () => {
  for (const l of LESSONS) {
    assert.ok(l.goals.length >= 3, `${l.id}: goals`);
    assert.ok(l.sections.length >= 5, `${l.id}: sections`);
    assert.equal(new Set(l.sections.map((s) => s.id)).size, l.sections.length, `${l.id}: duplicate section id`);
    for (const s of l.sections) assert.match(s.id, /^[a-z0-9-]+$/, `${l.id}: section id ${s.id}`);
    assert.ok(l.takeaways.length >= 4, `${l.id}: takeaways`);
    assert.ok(l.discuss.length >= 2, `${l.id}: discussion prompts`);
  }
});

test('every exam has 8 self-contained questions with valid answers', () => {
  for (const l of LESSONS) {
    assert.equal(l.exam.length, 8, `${l.id}: exam length`);
    assert.equal(new Set(l.exam.map((q) => q.q)).size, 8, `${l.id}: duplicate question`);
    for (const q of l.exam) {
      assert.ok(q.choices.length >= 3 && q.choices.length <= 5, `${l.id}: choices for "${q.q}"`);
      assert.equal(new Set(q.choices).size, q.choices.length, `${l.id}: duplicate choice in "${q.q}"`);
      assert.ok(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.choices.length, `${l.id}: answer for "${q.q}"`);
      assert.ok(q.explain && q.explain.length > 10, `${l.id}: explanation for "${q.q}"`);
      assert.doesNotMatch(q.q, /\b(same stock|above|previous question)\b/i, `${l.id}: questions are shuffled, so "${q.q}" must stand alone`);
    }
  }
  assert.equal(PASS_MARK, 75);
  assert.equal(correctToPass(LESSONS[0]), 6);
});

test('lesson terms exist in the glossary', () => {
  for (const l of LESSONS) for (const t of l.terms) assert.ok(GLOSSARY[t], `${l.id}: missing glossary term ${t}`);
});

test('videos and links are well formed', () => {
  for (const l of LESSONS) {
    for (const v of l.videos) {
      assert.ok(v.title && v.source, `${l.id}: video needs a title and source`);
      if (v.youtube) assert.match(v.youtube, /^[A-Za-z0-9_-]{11}$/, `${l.id}: YouTube id ${v.youtube}`);
      else assert.match(v.url, /^https:\/\//, `${l.id}: video url`);
    }
    for (const k of l.links) {
      assert.match(k.url, /^https:\/\//, `${l.id}: link ${k.url}`);
      assert.ok(k.title && k.org, `${l.id}: link needs a title and org`);
    }
  }
  for (const g of RESOURCE_GROUPS) for (const r of g.items) assert.match(r.url, /^https:\/\//, `resource ${r.title}`);
  for (const b of BOOKS) assert.ok(b.title && b.author && b.why, `book ${b.title}`);
});

test('lesson HTML is balanced and follows the style guide', () => {
  for (const l of LESSONS) {
    const text = allText(l);
    assert.doesNotMatch(text, DASHES, `${l.id}: use commas, colons, or periods instead of em or en dashes`);
    assert.doesNotMatch(text, /\$\{/, `${l.id}: stray template placeholder`);
    for (const s of l.sections) {
      for (const tag of ['aside', 'table', 'ul', 'ol', 'p', 'div']) {
        const open = (s.html.match(new RegExp(`<${tag}[\\s>]`, 'g')) || []).length;
        const close = (s.html.match(new RegExp(`</${tag}>`, 'g')) || []).length;
        assert.equal(open, close, `${l.id}/${s.id}: <${tag}> opened ${open} times and closed ${close} times`);
      }
      const notes = s.html.match(/class="note ([a-z]+)"/g) || [];
      for (const n of notes) assert.match(n, /note (idea|example|warn|try|alpha)"/, `${l.id}/${s.id}: unknown note style ${n}`);
    }
  }
  for (const [k, g] of Object.entries(GLOSSARY)) assert.doesNotMatch(g.term + g.def, DASHES, `glossary ${k}`);
});
