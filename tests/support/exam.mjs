// Browser test helper: takes a lesson exam on its own screen.
// Questions and choices are shuffled on every attempt, so the helper reads each question from the
// page, looks it up in the lesson data, and clicks the matching choice by its text.
import { lessonById } from '../../assets/js/data/lessons.js';

/**
 * @param {import('playwright').Page} page  a page already showing #/learn/<id>/exam
 * @param {string} lessonId
 * @param {{ wrong?: number }} options  how many questions to answer incorrectly (from the first)
 * @returns {Promise<string>} the result text (the headline, the score line, the tries line, and the buttons)
 */
export async function takeExam(page, lessonId, { wrong = 0 } = {}) {
  const lesson = lessonById(lessonId);
  if (!lesson) throw new Error(`unknown lesson ${lessonId}`);
  // An exam that is locked (no tries left) or already passed shows a result card instead of a
  // question. Say so instead of waiting out the question selector.
  const opening = await page.waitForSelector('#q-text, .exam-result');
  if (await opening.evaluate((el) => el.classList.contains('exam-result'))) {
    throw new Error(`the ${lessonId} exam did not open: ${(await opening.textContent()).replace(/\s+/g, ' ').trim()}`);
  }
  for (let i = 0; i < lesson.exam.length; i++) {
    await page.waitForFunction((n) => (document.querySelector('.q-count')?.textContent || '').startsWith(`Question ${n} `), i + 1);
    const text = (await page.textContent('#q-text')).trim();
    const q = lesson.exam.find((x) => x.q === text);
    if (!q) throw new Error(`question not found in lesson data: ${text}`);
    const pick = i < wrong ? (q.answer + 1) % q.choices.length : q.answer;
    const target = q.choices[pick];
    const buttons = await page.$$('.choice');
    let clicked = false;
    for (const b of buttons) {
      if ((await b.$eval('.c-text', (el) => el.textContent)).trim() === target) {
        await b.click();
        clicked = true;
        break;
      }
    }
    if (!clicked) throw new Error(`choice not found: ${target}`);
    await page.click('[data-next]');
  }
  await page.waitForSelector('.exam-result');
  return (await page.textContent('.exam-result')).replace(/\s+/g, ' ').trim();
}
