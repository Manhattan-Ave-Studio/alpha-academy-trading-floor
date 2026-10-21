// Lesson registry and helpers.
//
// Each lesson is plain data (see lessons-basics.js for the shape):
//   id, track, title, summary, goals[], sections[{ id, title, html }], takeaways[], discuss[],
//   videos[{ title, youtube | url, source }], links[{ title, org, url }], terms[], exam[{ q, choices, answer, explain }]
// Reading time is computed from the text, so editing a lesson keeps it accurate.
import { BASICS } from './lessons-basics.js';
import { PORTFOLIO } from './lessons-portfolio.js';
import { LIFE } from './lessons-life.js';
import { LEGACY } from './lessons-legacy.js';

/** Percent needed on a lesson exam to complete the lesson. Keep in sync with game_roster in the people migration. */
export const PASS_MARK = 75;
/** Tries a student gets on each lesson exam before an admin has to reset it. Keep in sync with complete_lesson in the modules migration. */
export const EXAM_TRIES = 3;

export const TRACKS = [
  { id: 'basics', title: 'Market Basics', blurb: 'How stocks, exchanges, quotes, and orders work.', icon: 'markets' },
  { id: 'portfolio', title: 'Building a Portfolio', blurb: 'Risk, diversification, funds, bonds and commodities, research, and the mindset of a long-term investor.', icon: 'portfolio' },
  { id: 'life', title: 'Money for Life', blurb: 'Compounding, paychecks, banking, credit, college, real accounts, and scams.', icon: 'tools' },
  { id: 'legacy', title: 'Wealth and Legacy', blurb: 'Generational wealth, the builders who came before you, and careers in finance.', icon: 'ranks' }
];

const WORDS_PER_MINUTE = 150; // careful reading, with tables and worked examples

function words(html) {
  return String(html || '').replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
}

/** Minutes to read a lesson, from its text. */
export function readingMinutes(lesson) {
  const n = words(lesson.summary)
    + (lesson.goals || []).reduce((s, g) => s + words(g), 0)
    + (lesson.sections || []).reduce((s, x) => s + words(x.title) + words(x.html), 0)
    + (lesson.takeaways || []).reduce((s, t) => s + words(t), 0);
  return Math.max(4, Math.round(n / WORDS_PER_MINUTE));
}

export const LESSONS = [...BASICS, ...PORTFOLIO, ...LIFE, ...LEGACY].map((l) => ({ ...l, minutes: readingMinutes(l) }));

export function lessonById(id) {
  return LESSONS.find((l) => l.id === id) || null;
}

export function lessonsForTrack(trackId) {
  return LESSONS.filter((l) => l.track === trackId);
}

export function lessonNumber(lesson) {
  return LESSONS.indexOf(lesson) + 1;
}

export function nextLesson(id) {
  const i = LESSONS.findIndex((l) => l.id === id);
  return i >= 0 && i < LESSONS.length - 1 ? LESSONS[i + 1] : null;
}

export function prevLesson(id) {
  const i = LESSONS.findIndex((l) => l.id === id);
  return i > 0 ? LESSONS[i - 1] : null;
}

/** progress: { [lessonId]: { score, completed_at } } */
export function isPassed(entry) {
  return !!entry && Number(entry.score) >= PASS_MARK;
}

export function passedCount(progress) {
  return LESSONS.filter((l) => isPassed(progress?.[l.id])).length;
}

/** Tries used on a lesson exam so far (entries saved before tries existed count as one). */
export function triesUsed(entry) {
  if (!entry) return 0;
  return entry.attempts == null ? 1 : Number(entry.attempts);
}

export function triesLeft(entry) {
  return Math.max(0, EXAM_TRIES - triesUsed(entry));
}

/** True when the exam cannot be taken again until an admin resets it. */
export function examLocked(entry) {
  return !!entry && !isPassed(entry) && triesUsed(entry) >= EXAM_TRIES;
}

/** Required lessons (ids from a game's required_lessons) the student has not passed yet, in order. */
export function requiredLeft(requiredIds, progress) {
  return (requiredIds || []).map((id) => lessonById(id)).filter((l) => l && !isPassed(progress?.[l.id]));
}

/** Required ids this build has no lesson for (a lesson renamed or removed since the game was set up). */
export function requiredUnknown(requiredIds) {
  return (requiredIds || []).filter((id) => !lessonById(id));
}

/**
 * True when a game requires lessons the student has not passed, so trading is closed to them.
 * Matches private.lessons_left in the database: a required id with no lesson in this build still
 * counts until an admin saves the game's required lessons again, which drops it.
 */
export function tradingLocked(game, progress) {
  const ids = game?.required_lessons || [];
  return ids.some((id) => !isPassed(progress?.[id]));
}

/** The first lesson not yet passed, for "continue" buttons. */
export function nextToStudy(progress) {
  return LESSONS.find((l) => !isPassed(progress?.[l.id])) || null;
}

/** Number of correct answers needed to pass an exam. */
export function correctToPass(lesson) {
  return Math.ceil((PASS_MARK / 100) * lesson.exam.length);
}

export function videoUrl(v) {
  return v.youtube ? `https://www.youtube.com/watch?v=${v.youtube}` : v.url;
}

/**
 * The address for YouTube's privacy-enhanced player (youtube-nocookie.com), or null for a video
 * that is not on YouTube. The lesson reader loads it only after a student presses Play, so nothing
 * reaches YouTube before that.
 */
export function videoEmbedUrl(v) {
  if (!/^[A-Za-z0-9_-]{11}$/.test(v.youtube || '')) return null;
  return `https://www.youtube-nocookie.com/embed/${v.youtube}?autoplay=1&playsinline=1&rel=0`;
}
