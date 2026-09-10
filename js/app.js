/* ── 墨 · 真题库 · App ────────────────────── */
(() => {
  'use strict';

  /* ── data store ──────────────────────────── */
  const DATA_URL = 'data/index.json';
  const DATA_DIR = 'data';
  let papers = [];
  let currentPaper = null;
  let currentQIndex = 0;
  let answers = {};
  let mode = 'quiz';
  let submitted = new Set();
  let activeCat = '数学一';

  /* ── DOM refs ────────────────────────────── */
  const $ = s => document.querySelector(s);
  const $$ = s => document.querySelectorAll(s);

  /* ── init ────────────────────────────────── */
  async function boot() {
    try {
      const idx = await fetch(DATA_URL).then(r => r.json());
      papers = idx.papers;
      $('#statTotal').textContent = idx.total_unique_questions;
      $('#statPapers').textContent = idx.papers.length;
      renderSidebar();
      updateDoneCount();
      loadPaperAt(0);
    } catch (e) {
      console.error('启动失败:', e);
      $('#inner').innerHTML = '<div class="card"><p>加载失败：' + e.message + '</p></div>';
    }
  }

  /* ── sidebar ─────────────────────────────── */
  function renderSidebar() {
    const byCat = {};
    for (const p of papers) {
      (byCat[p.paper] ??= []).push(p);
    }
    for (const btn of $$('.cat-btn')) {
      const cat = btn.dataset.cat;
      const list = byCat[cat] || [];
      btn.querySelector('.count').textContent = list.length ? `${list.length} 套` : '';
    }
    refreshYears();
  }

  function refreshYears() {
    const list = papers.filter(p => p.paper === activeCat).sort((a, b) => b.year - a.year);
    $('#years').innerHTML = list.map(p => {
      return `<button class="year-btn${p.year === currentPaper?.year ? ' active' : ''}" data-year="${p.year}">${p.year}</button>`;
    }).join('');
    $('#years').onclick = e => {
      const btn = e.target.closest('.year-btn');
      if (!btn) return;
      const yr = +btn.dataset.year;
      loadPaperByYear(yr);
    };
    $('#progressText').textContent = `正在加载 ${activeCat} …`;
  }

  /* ── load paper ──────────────────────────── */
  async function loadPaperByYear(year) {
    const p = papers.find(x => x.paper === activeCat && x.year === year);
    if (!p) return;
    await loadPaper(p);
  }

  async function loadPaper(p) {
    currentPaper = p;
    currentQIndex = 0;
    answers = {};
    submitted = new Set();
    $$('.cat-btn').forEach(b => b.classList.toggle('active', b.dataset.cat === p.paper));
    activeCat = p.paper;
    $$('.year-btn').forEach(b => b.classList.toggle('active', +b.dataset.year === p.year));
    renderQuestion();
    renderNavButtons();
  }

  async function loadPaperAt(idx) {
    const list = papers.filter(p => p.paper === activeCat).sort((a, b) => b.year - a.year);
    if (!list.length) return;
    await loadPaper(list[idx % list.length]);
  }

  /* ── render single question ─────────────── */
  function renderQuestion() {
    const list = papers.filter(p => p.paper === activeCat).sort((a, b) => b.year - a.year);
    if (!currentPaper) return;
    const p = currentPaper;
    const q = p.questions[currentQIndex];
    if (!q) return;

    const total = p.count;
    $('#progressText').textContent = `${p.year} · 第 ${currentQIndex + 1} / ${total} 题`;

    const isSubmitted = submitted.has(q.id);
    const userAns = answers[q.id];

    const diffLabel = q.difficulty === 0 ? '基础' : q.difficulty === 1 ? '中等' : '困难';

    const optionsHtml = q.options && Object.keys(q.options).length
      ? Object.entries(q.options).map(([k, v]) => {
          const cls = [];
          if (isSubmitted) {
            if (k === q.answer) cls.push('correct');
            else if (k === userAns && userAns !== q.answer) cls.push('wrong');
            cls.push('disabled');
          }
          if (userAns === k) cls.push('selected');
          const badge = k === q.answer ? '正确答案' : (k === userAns && k !== q.answer ? '你的选择' : '');
          return `<div class="opt ${cls.join(' ')}" data-key="${k}" data-qid="${q.id}">
            <span class="opt__marker">${k}</span>
            <span class="opt__text render-me">${escHtml(v)}</span>
            <span class="opt__badge">${badge}</span>
          </div>`;
        }).join('')
      : `<div class="meta" style="margin-bottom:1rem">本题为${q.type}，无选项。</div>`;

    const analysisHtml = q.analysis
      ? `<div class="analysis${isSubmitted ? ' visible' : ''}" id="analysis">
           <div class="analysis__label">【解析】</div>
           <div class="analysis__body render-me">${formatAnalysis(escHtml(q.analysis))}</div>
           <div class="analysis__answer">答案：${q.answer}</div>
           ${q.key_point ? `<div class="analysis__key">关键点：${escHtml(q.key_point)}</div>` : ''}
           ${q.pitfalls && q.pitfalls.length ? `<div class="analysis__pitfalls">${q.pitfalls.map(p => `<div class="pitfall">⚠ ${escHtml(p)}</div>`).join('')}</div>` : ''}
         </div>`
      : '';

    const stemHtml = `<div class="card__stem render-me">${escHtml(q.stem)}</div>`;

    $('#inner').innerHTML = `
      <article class="card">
        <div class="card__header">
          <span class="card__num display">${String(currentQIndex + 1).padStart(2, '0')}</span>
          <span class="card__type">${q.type}</span>
          <span class="card__diff">${p.year} · ${diffLabel}</span>
        </div>
        ${stemHtml}
        <div class="options" id="options">${optionsHtml}</div>
        ${analysisHtml}
        <div class="nav-row">
          <button class="btn btn--icon" data-nav="prev">‹ 上一题</button>
          <span class="nav-hint"><kbd>←</kbd><kbd>→</kbd> 或 <kbd>J</kbd><kbd>K</kbd> 切题</span>
          <button class="btn btn--icon" data-nav="next">下一题 ›</button>
        </div>
      </article>`;

    // click handlers for options
    $('#options').onclick = e => {
      const opt = e.target.closest('.opt');
      if (!opt || isSubmitted || mode === 'read') return;
      const qid = +opt.dataset.qid;
      const key = opt.dataset.key;
      answers[qid] = key;
      $$('.opt').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
    };

    // nav buttons
    $$('[data-nav]').forEach(b => b.onclick = () => {
      if (b.dataset.nav === 'prev') goPrev();
      else goNext();
    });

    if ($('#submitBtn')) $('#submitBtn').onclick = submitCurrent;

    // render katex
    requestAnimationFrame(() => {
      if (typeof renderMathInElement === 'function') {
        renderMathInElement($('#inner'), {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false },
          ],
          throwOnError: false
        });
      }
    });

    // scroll to top
    $('#canvas').scrollTop = 0;
  }

  /* ── submit / grade ──────────────────────── */
  function submitCurrent() {
    const list = papers.filter(p => p.paper === activeCat).sort((a, b) => b.year - a.year);
    const p = list.find(x => x.year === currentPaper?.year);
    if (!p) return;
    const q = p.questions[currentQIndex];
    if (!q) return;
    if (submitted.has(q.id)) return;
    submitted.add(q.id);
    answers[q.id] = answers[q.id] || q.answer;
    updateDoneCount();
    renderQuestion();
  }

  /* ── nav ─────────────────────────────────── */
  function goPrev() {
    if (currentQIndex > 0) { currentQIndex--; renderQuestion(); renderNavButtons(); }
  }
  function goNext() {
    if (currentPaper && currentQIndex < currentPaper.count - 1) { currentQIndex++; renderQuestion(); renderNavButtons(); }
  }
  function renderNavButtons() {
    const prev = $('#prevBtn');
    const next = $('#nextBtn');
    if (prev) prev.disabled = !currentPaper || currentQIndex === 0;
    if (next) next.disabled = !currentPaper || currentQIndex >= (currentPaper?.count || 1) - 1;
    if (prev) prev.style.opacity = prev.disabled ? '.35' : '1';
    if (next) next.style.opacity = next.disabled ? '.35' : '1';
  }

  /* ── keyboard ────────────────────────────── */
  document.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft' || e.key === 'j' || e.key === 'J') goPrev();
    if (e.key === 'ArrowRight' || e.key === 'k' || e.key === 'K') goNext();
    if ((e.key === 'Enter' || e.key === ' ') && mode === 'quiz') { e.preventDefault(); submitCurrent(); }
  });

  /* ── mode toggle ─────────────────────────── */
  $$('.mode-tab').forEach(btn => {
    btn.onclick = () => {
      $$('.mode-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      mode = btn.dataset.mode;
      const sub = $('#submitBtn');
      if (sub) sub.style.display = mode === 'read' ? 'none' : '';
      if (mode === 'read') {
        $$('.analysis').forEach(el => el.classList.add('visible'));
      }
    };
  });

  /* ── cat buttons ─────────────────────────── */
  $$('.cat-btn').forEach(btn => {
    btn.onclick = () => {
      $$('.cat-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCat = btn.dataset.cat;
      loadPaperAt(0);
    };
  });

  /* ── menu toggle (mobile) ────────────────── */
  const menuBtn = $('#menuBtn');
  const sidebar = $('#sidebar');
  menuBtn?.addEventListener('click', () => {
    const open = sidebar.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', open);
  });
  $('#years')?.addEventListener('click', () => {
    if (window.innerWidth <= 860) { sidebar.classList.remove('open'); menuBtn?.setAttribute('aria-expanded', 'false'); }
  });

  /* ── helpers ─────────────────────────────── */
  function escHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatAnalysis(raw) {
    let html = raw
      .replace(/\[分析\]/g, '<strong>【分析】</strong>')
      .replace(/\[解答\]/g, '<strong>【解答】</strong>');
    html = html.split('\n').map(line => {
      line = line.replace(/^【(.+?)】/, '<strong>【$1】</strong>');
      return `<p>${line}</p>`;
    }).join('');
    return html.replace(/<p><\/p>/g, '');
  }

  function updateDoneCount() {
    const done = submitted.size;
    const el = $('#statDone');
    if (el) el.textContent = done;
  }

  /* ── load paper JSON dynamically ─────────── */
  async function loadPaperJSON(file) {
    const rel = String(file).replace(/\\/g, '/');
    const url = DATA_DIR + '/' + rel.split('/').map(encodeURIComponent).join('/');
    const r = await fetch(url);
    if (!r.ok) throw new Error('加载失败: ' + url);
    return r.json();
  }

  // override loadPaper to fetch questions from JSON
  const _origLoadPaper = loadPaper;
  loadPaper = async p => {
    try {
      const data = await loadPaperJSON(p.file);
      currentPaper = { ...p, questions: data.questions };
      currentQIndex = 0;
      answers = {};
      submitted = new Set();
      $$('.cat-btn').forEach(b => b.classList.toggle('active', b.dataset.cat === p.paper));
      activeCat = p.paper;
      $$('.year-btn').forEach(b => b.classList.toggle('active', +b.dataset.year === p.year));
      refreshYears();
      renderQuestion();
      renderNavButtons();
    } catch (e) {
      console.error('加载试卷失败:', e);
      $('#inner').innerHTML = '<div class="card"><p>加载失败：' + e.message + '</p></div>';
    }
  };

  boot();
})();
