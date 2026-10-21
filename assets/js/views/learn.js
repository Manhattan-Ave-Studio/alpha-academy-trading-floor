// Learn: the course overview, the lesson reader, the lesson exam (its own screen), and the glossary.
import { html, raw, $, $$, debounce } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { toast, confirmSheet } from '../lib/ui.js';
import { etWhen } from '../lib/format.js';
import { store, playerId } from '../state.js';
import {
  TRACKS, LESSONS, PASS_MARK, EXAM_TRIES, lessonById, lessonsForTrack, lessonNumber, nextLesson, prevLesson,
  isPassed, passedCount, nextToStudy, correctToPass, videoUrl, videoEmbedUrl,
  triesUsed, triesLeft, examLocked, requiredLeft, requiredUnknown
} from '../data/lessons.js';
import { GLOSSARY, glossaryList } from '../data/glossary.js';
import { pageHead, footer, empty } from './common.js';

async function progress() {
  const pid = playerId();
  if (!pid) return store.lessons || {};
  try {
    store.lessons = await store.api.lessonProgress(pid);
  } catch (_) {
    // keep what we have
  }
  return store.lessons || {};
}

/** A small progress ring. value and max are numbers; label sits in the middle. */
function ring(value, max, label, { size = 112, stroke = 9, tone = 'gold' } = {}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const frac = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return `<svg class="ring ${tone}" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" aria-hidden="true">
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke-width="${stroke}" class="ring-track"/>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke-width="${stroke}" class="ring-fill"
      stroke-dasharray="${(c * frac).toFixed(2)} ${c.toFixed(2)}" stroke-linecap="round" transform="rotate(-90 ${size / 2} ${size / 2})"/>
    <text x="50%" y="50%" text-anchor="middle" dominant-baseline="central" class="ring-label">${label}</text>
  </svg>`;
}

function statusOf(entry) {
  if (isPassed(entry)) return { cls: 'passed', text: `Passed ${entry.score}%` };
  if (entry) return { cls: 'tried', text: `Best ${entry.score}%` };
  return { cls: '', text: 'Not started' };
}

function plural(n, one, many) {
  return `${n} ${n === 1 ? one : many}`;
}

/** The note that takes the place of the exam button once the tries are used up. */
const LOCKED_NOTE = 'No tries left. Ask a mentor to reset this exam.';

/** Lessons the student's game requires, as ids this build knows. Empty outside a game. */
function requiredIds() {
  if (!playerId()) return [];
  return (store.current?.game?.required_lessons || []).filter((id) => lessonById(id));
}

/** One line on where a lesson exam stands: tries left, the best score so far, or the pass. */
function triesLine(entry) {
  if (isPassed(entry)) return `Passed with ${entry.score}%.`;
  if (!entry) return `${plural(EXAM_TRIES, 'try', 'tries')}. Score ${PASS_MARK}% or better to pass.`;
  const left = triesLeft(entry);
  return `Best so far ${entry.score}%. ${left ? `${plural(left, 'try', 'tries')} left.` : 'No tries left.'}`;
}

/** The Learn index line on the game's required lessons, or nothing when none are required. */
function requiredLine(required, done) {
  const unknown = playerId() ? requiredUnknown(store.current?.game?.required_lessons) : [];
  if (!required.length && !unknown.length) return '';
  const left = requiredLeft(required, done);
  const stale = unknown.length ? ' This game also requires a lesson that is no longer in the course. Ask a mentor to save the required lessons again.' : '';
  if (!left.length && !unknown.length) {
    return html`<div class="banner up" role="note" data-required-line>${raw(icon('check'))}<div class="grow"><b>Required lessons: all passed.</b> Trading is open.</div></div>`;
  }
  return html`<div class="banner gold" role="note" data-required-line>${raw(icon('lock'))}<div class="grow">
    <b>Required before trading: ${required.length - left.length} of ${required.length} passed.</b>
    ${left.length ? html`Still to pass: ${left.map((l, i) => html`${i ? ', ' : ''}<a href="#/learn/${l.id}">${l.title}</a>`)}.` : ''}${stale}
  </div></div>`;
}

// ------------------------------------------------------------------ course overview

export async function renderIndex() {
  const done = await progress();
  const passed = passedCount(done);
  const attempted = LESSONS.filter((l) => done[l.id]);
  const avg = attempted.length ? Math.round(attempted.reduce((s, l) => s + Number(done[l.id].score), 0) / attempted.length) : null;
  const required = requiredIds();
  const requiredSet = new Set(required);
  const next = requiredLeft(required, done)[0] || nextToStudy(done);

  const markup = html`
    ${pageHead('Learn', `${LESSONS.length} lessons in four tracks. Read a lesson, watch its videos, then take its exam on its own screen. Score ${PASS_MARK}% or better to complete it. You get ${EXAM_TRIES} tries on each exam.`,
      html`<a class="btn secondary" href="#/glossary">${raw(icon('book'))} Glossary</a><a class="btn secondary" href="#/tools">${raw(icon('tools'))} Calculators</a>`)}
    <section class="panel learn-hero">
      ${raw(ring(passed, LESSONS.length, `${passed}/${LESSONS.length}`, { size: 120 }))}
      <div class="stack" style="gap:8px; min-width:0">
        <h2>${passed === LESSONS.length ? 'Every lesson passed' : `${plural(passed, 'lesson', 'lessons')} passed`}</h2>
        <p class="muted">${avg != null ? `Your average best exam score is ${avg}%.` : 'Your exam scores will show here as you go.'}
          ${!playerId() ? ' Join a game to save your progress.' : ''}</p>
        <div class="row-wrap">
          ${next
            ? html`<a class="btn" href="#/learn/${next.id}">${done[next.id] ? 'Keep going' : 'Start'}: lesson ${lessonNumber(next)}, ${next.title}</a>`
            : html`<a class="btn" href="#/tools">Try the calculators</a>`}
          ${!playerId() ? html`<a class="btn secondary" href="#/join">Join a game</a>` : ''}
        </div>
      </div>
    </section>
    ${requiredLine(required, done)}
    ${TRACKS.map((t, ti) => {
      const list = lessonsForTrack(t.id);
      const tp = list.filter((l) => isPassed(done[l.id])).length;
      return html`<section class="track-block" aria-labelledby="track-${t.id}">
        <header class="track-head">
          <div class="track-title">
            <span class="track-icon">${raw(icon(t.icon))}</span>
            <div><p class="track-kicker">Track ${ti + 1}</p><h2 id="track-${t.id}">${t.title}</h2><p class="muted">${t.blurb}</p></div>
          </div>
          <div class="track-progress"><span class="data">${tp} of ${list.length} passed</span><div class="progress"><span style="width:${(tp / list.length) * 100}%"></span></div></div>
        </header>
        <ol class="lesson-list">
          ${list.map((l) => {
            const st = statusOf(done[l.id]);
            return html`<li><a class="lesson-row ${st.cls}" href="#/learn/${l.id}">
              <span class="num">${isPassed(done[l.id]) ? raw(icon('check')) : lessonNumber(l)}</span>
              <span class="body">
                <span class="title"><b>${l.title}</b>${requiredSet.has(l.id) ? html`<span class="chip gold small" data-required-chip>Required</span>` : ''}</span>
                <span class="summary">${l.summary}</span>
              </span>
              <span class="facts">
                <span>${raw(icon('clock'))}${l.minutes} min</span>
                ${l.videos.length ? html`<span>${raw(icon('play'))}${plural(l.videos.length, 'video', 'videos')}</span>` : html`<span></span>`}
              </span>
              <span class="status">${st.text}</span>
            </a></li>`;
          })}
        </ol>
      </section>`;
    })}
    ${footer()}`;
  return { html: markup };
}

// ------------------------------------------------------------------ lesson reader

function tocItems(lesson) {
  const items = lesson.sections.map((s, i) => ({ id: `s-${s.id}`, label: s.title, n: i + 1 }));
  if (lesson.videos.length) items.push({ id: 'watch', label: 'Watch' });
  items.push({ id: 'terms', label: 'Key terms' }, { id: 'takeaways', label: 'Takeaways' }, { id: 'exam', label: 'Lesson exam' });
  return items;
}

function tocList(items) {
  return html`<ol class="toc-list">${items.map((it) => html`<li><button type="button" data-goto="${it.id}">${it.n ? html`<span class="toc-n">${it.n}</span>` : ''}<span>${it.label}</span></button></li>`)}</ol>`;
}

function prose(markup) {
  return markup.replace(/<table class="data-table">/g, '<div class="table-wrap"><table class="data-table">').replace(/<\/table>/g, '</table></div>');
}

export async function renderLesson({ params }) {
  const lesson = lessonById(params.id);
  if (!lesson) return { html: html`<div class="panel">${empty('Lesson not found', '', html`<a class="btn" href="#/learn">All lessons</a>`)}</div>` };
  const done = await progress();
  const track = TRACKS.find((t) => t.id === lesson.track);
  const prior = done[lesson.id];
  const passed = isPassed(prior);
  const locked = examLocked(prior);
  const required = requiredIds().includes(lesson.id);
  const next = nextLesson(lesson.id);
  const prev = prevLesson(lesson.id);
  const items = tocItems(lesson);
  const need = correctToPass(lesson);
  const terms = lesson.terms.filter((t) => GLOSSARY[t]);

  const markup = html`
    <div class="reading-progress" aria-hidden="true"><span></span></div>
    <div class="split"><a class="btn ghost small" href="#/learn">${raw(icon('back'))} All lessons</a></div>
    <header class="lesson-hero">
      <p class="lesson-kicker">${track.title}, lesson ${lessonNumber(lesson)} of ${LESSONS.length}</p>
      <h1>${lesson.title}</h1>
      <p class="lede">${lesson.summary}</p>
      <ul class="lesson-facts">
        <li>${raw(icon('clock'))}${lesson.minutes} min read</li>
        ${lesson.videos.length ? html`<li>${raw(icon('play'))}${plural(lesson.videos.length, 'video', 'videos')}</li>` : ''}
        <li>${raw(icon('exam'))}Exam: ${lesson.exam.length} questions</li>
        ${prior ? html`<li class="${passed ? 'passed' : 'tried'}">${raw(icon(passed ? 'check' : locked ? 'lock' : 'refresh'))}${passed ? `Passed with ${prior.score}%` : `Best so far ${prior.score}%`}</li>` : ''}
        ${required ? html`<li class="required">${raw(icon('mentor'))}Required before trading</li>` : ''}
      </ul>
    </header>

    <details class="toc-mobile"><summary>In this lesson</summary>${tocList(items)}</details>

    <div class="lesson-layout">
      <nav class="lesson-toc" aria-label="In this lesson">
        <p class="toc-title">In this lesson</p>
        ${tocList(items)}
      </nav>

      <article class="lesson-body">
        <section class="goals" aria-labelledby="goals-h">
          <h2 id="goals-h">What you will be able to do</h2>
          <ul class="goal-list">${lesson.goals.map((g) => html`<li>${raw(icon('check'))}<span>${g}</span></li>`)}</ul>
        </section>

        ${lesson.sections.map((s, i) => html`<section class="lesson-section" id="s-${s.id}" data-section aria-labelledby="h-${s.id}">
          <h2 id="h-${s.id}"><span class="sec-num">${i + 1}</span>${s.title}</h2>
          <div class="prose">${raw(prose(s.html))}</div>
        </section>`)}

        ${lesson.videos.length ? html`<section class="lesson-section" id="watch" data-section aria-labelledby="h-watch">
          <h2 id="h-watch">Watch</h2>
          <p class="muted">Short explainers that go with this lesson. Press play to watch here. Nothing loads from YouTube until you do.</p>
          <div class="video-list">${lesson.videos.map((v, i) => videoEmbedUrl(v)
            ? html`<figure class="video">
                <div class="video-frame">
                  <button class="video-start" type="button" data-play="${i}" aria-label="Play video: ${v.title}">
                    <span class="play">${raw(icon('playSolid'))}</span>
                    <span class="v-title">${v.title}</span>
                    <span class="v-hint">Plays here</span>
                  </button>
                </div>
                <figcaption><span>${v.source}${v.note ? `. ${v.note}` : ''}</span><a href="${videoUrl(v)}" target="_blank" rel="noopener noreferrer">Open on YouTube<span class="sr-only">: ${v.title}</span>${raw(icon('external', 'v-ext'))}</a></figcaption>
              </figure>`
            : html`<a class="video-card" href="${videoUrl(v)}" target="_blank" rel="noopener noreferrer">
                <span class="play">${raw(icon('play'))}</span>
                <span class="v-body"><b>${v.title}</b><span class="v-src">${v.source}${v.note ? `. ${v.note}` : ''}. Opens in a new tab.</span></span>
                ${raw(icon('external', 'v-ext'))}
              </a>`)}</div>
        </section>` : ''}

        <section class="lesson-section" id="terms" data-section aria-labelledby="h-terms">
          <h2 id="h-terms">Key terms</h2>
          <dl class="term-grid">${terms.map((t) => html`<div><dt>${GLOSSARY[t].term}</dt><dd>${GLOSSARY[t].def}</dd></div>`)}</dl>
        </section>

        <section class="lesson-section takeaways" id="takeaways" data-section aria-labelledby="h-take">
          <h2 id="h-take">Takeaways</h2>
          <ul>${lesson.takeaways.map((t) => html`<li>${t}</li>`)}</ul>
        </section>

        ${lesson.discuss?.length ? html`<section class="lesson-section" aria-labelledby="h-discuss">
          <h2 id="h-discuss">Talk it over</h2>
          <p class="muted">Questions for your next session with your mentor.</p>
          <ul class="discuss-list">${lesson.discuss.map((d) => html`<li>${d}</li>`)}</ul>
        </section>` : ''}

        ${lesson.links?.length ? html`<section class="lesson-section" aria-labelledby="h-links">
          <h2 id="h-links">Go deeper</h2>
          <ul class="link-list">${lesson.links.map((l) => html`<li><a href="${l.url}" target="_blank" rel="noopener noreferrer">${l.title}${raw(icon('external', 'inline-ext'))}</a><span>${l.org}</span></li>`)}</ul>
        </section>` : ''}

        <section class="exam-cta" id="exam" data-section aria-labelledby="h-exam">
          <div class="stack" style="gap:6px; min-width:0">
            <h2 id="h-exam">Lesson exam</h2>
            <p>${lesson.exam.length} questions on their own screen. Answer at least ${need} correctly (${PASS_MARK}%) to complete the lesson. Your best score counts.</p>
            <p class="${passed ? 'up' : 'muted'}"><b data-tries>${triesLine(prior)}</b>${prior?.completed_at ? html` <span class="faint">Best score from ${etWhen(prior.completed_at)}.</span>` : ''}</p>
          </div>
          ${passed
            ? html`<span class="chip up exam-chip">${raw(icon('check'))} Passed</span>`
            : locked
              ? html`<p class="exam-locked" data-exam-locked>${raw(icon('lock'))}<span>${LOCKED_NOTE}</span></p>`
              : html`<a class="btn" href="#/learn/${lesson.id}/exam">${raw(icon('exam'))} ${prior ? 'Retake the exam' : 'Start the exam'}</a>`}
        </section>

        <nav class="lesson-pager" aria-label="More lessons">
          ${prev ? html`<a class="pager prev" href="#/learn/${prev.id}"><span class="faint">Previous lesson</span><b>${prev.title}</b></a>` : html`<span></span>`}
          ${next ? html`<a class="pager next" href="#/learn/${next.id}"><span class="faint">Next lesson</span><b>${next.title}</b></a>` : html`<a class="pager next" href="#/learn"><span class="faint">You reached the end</span><b>Back to all lessons</b></a>`}
        </nav>
      </article>
    </div>
    ${footer()}`;

  return {
    html: markup,
    mount(el) {
      const bar = $('.reading-progress span', el);
      const article = $('.lesson-body', el);
      const tocButtons = $$('[data-goto]', el);

      // Swap a video's Play button for YouTube's privacy-enhanced player. Built with DOM calls, not
      // markup strings, and only after the click, so nothing loads from YouTube before a student chooses.
      const startVideo = (button) => {
        const v = lesson.videos[Number(button.dataset.play)];
        const src = v && videoEmbedUrl(v);
        if (!src) return;
        const player = document.createElement('iframe');
        player.src = src;
        player.title = v.title;
        player.allow = 'autoplay; encrypted-media; picture-in-picture; web-share';
        player.allowFullscreen = true;
        // YouTube refuses to play embeds that send no referrer, so keep the browser default.
        player.referrerPolicy = 'strict-origin-when-cross-origin';
        button.replaceWith(player);
        player.focus();
      };

      const onClick = (e) => {
        const play = e.target.closest('[data-play]');
        if (play) {
          startVideo(play);
          return;
        }
        const b = e.target.closest('[data-goto]');
        if (!b) return;
        const target = el.querySelector('#' + b.dataset.goto);
        if (!target) return;
        const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        target.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
        const details = b.closest('details');
        if (details) details.open = false;
      };
      el.addEventListener('click', onClick);

      let frame = 0;
      const paint = () => {
        frame = 0;
        if (!article || !bar) return;
        const r = article.getBoundingClientRect();
        const total = r.height - window.innerHeight * 0.6;
        const p = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 1;
        bar.style.transform = `scaleX(${p.toFixed(3)})`;
      };
      const onScroll = () => {
        if (!frame) frame = requestAnimationFrame(paint);
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll);
      paint();

      let observer = null;
      if ('IntersectionObserver' in window) {
        const sections = $$('[data-section]', el);
        const visible = new Map();
        observer = new IntersectionObserver((entries) => {
          for (const en of entries) visible.set(en.target.id, en.isIntersecting ? en.boundingClientRect.top : null);
          let current = null;
          for (const s of sections) {
            const top = visible.get(s.id);
            if (top != null) {
              current = s.id;
              break;
            }
          }
          if (current) tocButtons.forEach((b) => b.setAttribute('aria-current', b.dataset.goto === current ? 'true' : 'false'));
        }, { rootMargin: '-20% 0px -60% 0px' });
        sections.forEach((s) => observer.observe(s));
      }

      return () => {
        el.removeEventListener('click', onClick);
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onScroll);
        if (frame) cancelAnimationFrame(frame);
        observer?.disconnect();
      };
    }
  };
}

// ------------------------------------------------------------------ lesson exam

function shuffled(n) {
  const a = [...Array(n).keys()];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

export async function renderExam({ params, navigate }) {
  const lesson = lessonById(params.id);
  if (!lesson) return { html: html`<div class="panel">${empty('Lesson not found', '', html`<a class="btn" href="#/learn">All lessons</a>`)}</div>` };
  const done = await progress();
  const entry = done[lesson.id];
  const tracked = !!playerId();

  // A passed lesson is finished, and a locked exam waits for an admin: neither shows the questions.
  if (tracked && (isPassed(entry) || examLocked(entry))) {
    const passed = isPassed(entry);
    const next = nextLesson(lesson.id);
    return {
      html: html`<div class="exam-shell">
        <header class="exam-head">
          <a class="btn ghost small" href="#/learn/${lesson.id}">${raw(icon('back'))} Back to lesson</a>
          <div class="exam-title"><span class="faint">Lesson ${lessonNumber(lesson)} exam</span><b>${lesson.title}</b></div>
        </header>
        <section class="exam-stage">
          <div class="exam-result ${passed ? 'pass' : 'retry'}">
            ${raw(ring(Number(entry.score), 100, `${entry.score}%`, { size: 132, stroke: 10, tone: passed ? 'up' : 'gold' }))}
            <div class="stack" style="gap:8px; min-width:0">
              <h1 id="result-h" tabindex="-1">${passed ? 'Lesson complete' : 'Out of tries'}</h1>
              ${passed
                ? html`<p class="result-line">You passed this lesson with ${entry.score}%, so there is nothing to retake.</p>`
                : html`<p class="result-line" data-exam-locked>${LOCKED_NOTE}</p>`}
              <p class="muted">Best score ${entry.score}%. Pass mark ${PASS_MARK}%.</p>
              <div class="row-wrap">
                ${passed && next ? html`<a class="btn" href="#/learn/${next.id}">Next lesson: ${next.title}</a>` : ''}
                <a class="btn ${passed && next ? 'secondary' : ''}" href="#/learn/${lesson.id}">Back to lesson</a>
              </div>
            </div>
          </div>
        </section>
      </div>`
    };
  }

  const markup = html`
    <div class="exam-shell">
      <header class="exam-head">
        <button class="btn ghost small" type="button" data-exit>${raw(icon('back'))} Back to lesson</button>
        <div class="exam-title"><span class="faint">Lesson ${lessonNumber(lesson)} exam</span><b>${lesson.title}</b></div>
      </header>
      <div class="exam-steps" role="progressbar" aria-label="Exam progress" aria-valuemin="0" aria-valuemax="${lesson.exam.length}" aria-valuenow="0">
        ${lesson.exam.map(() => html`<span></span>`)}
      </div>
      <section class="exam-stage" id="exam-stage" aria-live="polite"></section>
    </div>`;

  return {
    html: markup,
    mount(el) {
      document.body.classList.add('exam-mode');
      const stage = $('#exam-stage', el);
      const steps = $$('.exam-steps span', el);
      const stepsBar = $('.exam-steps', el);
      let order;
      let choiceOrder;
      let answers;
      let index;
      let finished;

      const start = () => {
        order = shuffled(lesson.exam.length);
        choiceOrder = order.map((qi) => shuffled(lesson.exam[qi].choices.length));
        answers = new Array(lesson.exam.length).fill(null); // original choice index per position
        index = 0;
        finished = false;
        showQuestion();
      };

      const paintSteps = () => {
        steps.forEach((s, i) => {
          s.className = finished ? '' : answers[i] != null ? 'answered' : '';
          if (!finished && i === index) s.classList.add('current');
        });
        stepsBar.setAttribute('aria-valuenow', String(answers.filter((a) => a != null).length));
        stepsBar.hidden = finished;
      };

      const showQuestion = () => {
        const q = lesson.exam[order[index]];
        const last = index === order.length - 1;
        stage.innerHTML = html`<div class="exam-card">
          <p class="q-count">Question ${index + 1} of ${order.length}</p>
          <h1 class="q-text" id="q-text" tabindex="-1">${q.q}</h1>
          <div class="choices" role="radiogroup" aria-labelledby="q-text">
            ${choiceOrder[index].map((ci, k) => html`<button type="button" class="choice" role="radio" aria-checked="${answers[index] === ci}" data-choice="${ci}">
              <span class="key">${LETTERS[k]}</span><span class="c-text">${q.choices[ci]}</span></button>`)}
          </div>
          <div class="exam-actions">
            <button class="btn secondary" type="button" data-back ${index === 0 ? 'disabled' : ''}>Back</button>
            <button class="btn" type="button" data-next ${answers[index] == null ? 'disabled' : ''}>${last ? 'Finish exam' : 'Next question'}</button>
          </div>
          <p class="exam-hint faint">Press ${LETTERS.slice(0, q.choices.length).join(', ')} to choose and Enter to continue.</p>
        </div>`.toString();
        paintSteps();
        $('#q-text', stage)?.focus({ preventScroll: true });
      };

      const choose = (ci) => {
        answers[index] = ci;
        $$('.choice', stage).forEach((b) => b.setAttribute('aria-checked', String(Number(b.dataset.choice) === ci)));
        const nextBtn = $('[data-next]', stage);
        if (nextBtn) nextBtn.disabled = false;
        paintSteps();
      };

      // The headline, the tries line, and the buttons depend on the saved entry (best score, tries used).
      // They paint once from what the save should return, and again from what it did return.
      const paintOutcome = (en) => {
        const passed = isPassed(en);
        const left = triesLeft(en);
        const lockedNow = tracked && !passed && left === 0;
        const canRetake = !passed && (!tracked || left > 0);
        const h = $('#result-h', stage);
        if (h) h.textContent = passed ? 'Lesson complete' : lockedNow ? 'Out of tries' : 'Keep going';
        const line = $('[data-exam-tries]', stage);
        if (line) {
          line.innerHTML = html`${lockedNow ? html`<b data-exam-locked>${LOCKED_NOTE}</b> ` : ''}Best score ${en.score}%. Pass mark ${PASS_MARK}%.${
            !tracked ? ' Join a game to save your progress.' : canRetake ? ` ${plural(left, 'try', 'tries')} left.` : ''}`.toString();
        }
        const actions = $('[data-exam-actions]', stage);
        if (actions) {
          const next = nextLesson(lesson.id);
          const nextBtn = passed && next;
          actions.innerHTML = html`
            ${nextBtn ? html`<a class="btn" href="#/learn/${next.id}">Next lesson: ${next.title}</a>` : ''}
            ${canRetake ? html`<button class="btn" type="button" data-retake>${raw(icon('refresh'))} Retake the exam</button>` : ''}
            <a class="btn ${nextBtn || canRetake ? 'secondary' : ''}" href="#/learn/${lesson.id}">Back to lesson</a>`.toString();
        }
      };

      const finish = async () => {
        finished = true;
        const right = order.filter((qi, i) => answers[i] === lesson.exam[qi].answer).length;
        const score = Math.round((right / order.length) * 100);
        const passedNow = score >= PASS_MARK;
        const prior = store.lessons?.[lesson.id];
        paintSteps();

        // What the save should come back with: the best score and one more try used.
        let entry = {
          score: Math.max(score, Number(prior?.score ?? 0)),
          completed_at: !prior || score > Number(prior.score) ? new Date().toISOString() : prior.completed_at,
          attempts: triesUsed(prior) + 1
        };
        const moreTries = !tracked || triesLeft(entry) > 0;

        stage.innerHTML = html`<div class="exam-result ${passedNow ? 'pass' : 'retry'}">
          ${raw(ring(score, 100, `${score}%`, { size: 132, stroke: 10, tone: passedNow ? 'up' : 'gold' }))}
          <div class="stack" style="gap:8px; min-width:0">
            <h1 id="result-h" tabindex="-1">${passedNow ? 'Lesson complete' : 'Keep going'}</h1>
            <p class="result-line"><b>${right} of ${order.length} correct.</b> ${passedNow
              ? `You passed with ${score}%.`
              : `You need ${correctToPass(lesson)} of ${order.length} to pass. Review the explanations below${moreTries ? ', then try again.' : '.'}`}</p>
            <p class="muted" data-exam-tries></p>
            <div class="row-wrap" data-exam-actions></div>
          </div>
        </div>
        <section class="exam-review" aria-labelledby="review-h">
          <h2 id="review-h">Review your answers</h2>
          <ol class="review-list">
            ${order.map((qi, i) => {
              const q = lesson.exam[qi];
              const ok = answers[i] === q.answer;
              return html`<li class="${ok ? 'right' : 'wrong'}">
                <span class="mark">${raw(icon(ok ? 'check' : 'close'))}</span>
                <div class="stack" style="gap:6px; min-width:0">
                  <p class="r-q">${q.q}</p>
                  <p>Your answer: <b>${q.choices[answers[i]]}</b></p>
                  ${ok ? '' : html`<p>Correct answer: <b>${q.choices[q.answer]}</b></p>`}
                  <p class="r-why">${q.explain}</p>
                </div>
              </li>`;
            })}
          </ol>
        </section>`.toString();
        paintOutcome(entry);
        $('#result-h', stage)?.focus({ preventScroll: true });
        window.scrollTo(0, 0);

        if (tracked) {
          try {
            const saved = await store.api.completeLesson(playerId(), lesson.id, score);
            // A database without the tries migration answers with nothing; keep the local entry then.
            if (saved && saved.score != null) {
              entry = {
                score: Number(saved.score),
                completed_at: saved.completed_at ?? entry.completed_at,
                attempts: saved.attempts == null ? entry.attempts : Number(saved.attempts)
              };
            }
            store.lessons = { ...store.lessons, [lesson.id]: entry };
            paintOutcome(entry);
            toast(passedNow ? 'Lesson complete. Progress saved.' : 'Score saved', 'good');
          } catch (err) {
            toast(err.message, 'bad');
          }
        }
      };

      const onClick = async (e) => {
        const c = e.target.closest('[data-choice]');
        if (c && !finished) return choose(Number(c.dataset.choice));
        if (e.target.closest('[data-next]')) {
          if (answers[index] == null) return;
          if (index < order.length - 1) {
            index++;
            showQuestion();
          } else {
            finish();
          }
          return;
        }
        if (e.target.closest('[data-back]')) {
          if (index > 0) {
            index--;
            showQuestion();
          }
          return;
        }
        if (e.target.closest('[data-retake]')) {
          start();
          window.scrollTo(0, 0);
          return;
        }
        if (e.target.closest('[data-exit]')) {
          const inProgress = !finished && answers.some((a) => a != null);
          if (inProgress) {
            const ok = await confirmSheet({ title: 'Leave the exam?', message: 'Your answers so far will not be saved.', confirmLabel: 'Leave the exam' });
            if (!ok) return;
          }
          navigate(`/learn/${lesson.id}`);
        }
      };
      el.addEventListener('click', onClick);

      const onKey = (e) => {
        if (finished || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
        if (document.querySelector('.scrim')) return;
        const tag = (e.target && e.target.tagName) || '';
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        const q = lesson.exam[order[index]];
        const k = e.key.toUpperCase();
        let pos = LETTERS.indexOf(k);
        if (pos < 0 && /^[1-9]$/.test(e.key)) pos = Number(e.key) - 1;
        if (pos >= 0 && pos < q.choices.length) {
          e.preventDefault();
          choose(choiceOrder[index][pos]);
          return;
        }
        // Enter on a focused button keeps its normal behavior; elsewhere it moves on.
        if (e.key === 'Enter' && answers[index] != null && !(e.target instanceof HTMLButtonElement)) {
          e.preventDefault();
          $('[data-next]', stage)?.click();
        }
      };
      document.addEventListener('keydown', onKey);

      start();

      return () => {
        document.body.classList.remove('exam-mode');
        el.removeEventListener('click', onClick);
        document.removeEventListener('keydown', onKey);
      };
    }
  };
}

// ------------------------------------------------------------------ glossary

export async function renderGlossary() {
  const list = glossaryList();
  const row = (g) => html`<div class="list-row" style="grid-template-columns: minmax(0,1fr)" id="g-${g.id}"><div class="who"><b style="font-family:var(--font-body); letter-spacing:0">${g.term}</b><span style="white-space:normal; font-size:var(--step-0)">${g.def}</span></div></div>`;
  const markup = html`
    ${pageHead('Glossary', `${list.length} money and market terms in plain English.`, html`<a class="btn secondary" href="#/learn">${raw(icon('back'))} Lessons</a>`)}
    <div class="search" style="max-width:520px">${raw(icon('search'))}<label class="sr-only" for="g-search">Search the glossary</label>
      <input id="g-search" class="input" type="search" placeholder="Search terms, like P/E or Roth" autocomplete="off"></div>
    <section class="panel flush"><div class="list" id="g-list">${list.map(row)}</div></section>
    ${footer()}`;
  return {
    html: markup,
    mount(el) {
      const input = $('#g-search', el);
      input.addEventListener('input', debounce(() => {
        const q = input.value.trim().toLowerCase();
        const rows = q ? list.filter((g) => g.term.toLowerCase().includes(q) || g.def.toLowerCase().includes(q)) : list;
        $('#g-list', el).innerHTML = (rows.length ? html`${rows.map(row)}` : empty(`No terms match "${input.value}"`)).toString();
      }, 120));
    }
  };
}
