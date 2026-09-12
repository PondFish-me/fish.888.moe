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
  let loadSequence = 0;

  /* ── DOM refs ────────────────────────────── */
  const $ = s => document.querySelector(s);
  const $$ = s => document.querySelectorAll(s);

  /* ── init ────────────────────────────────── */
  async function boot() {
    try {
      const response = await fetch(DATA_URL);
      if (!response.ok) throw new Error('题库索引暂时无法读取，请刷新重试。');
      const idx = await response.json();
      papers = idx.papers;
      $('#statTotal').textContent = idx.total_unique_questions;
      $('#statPapers').textContent = idx.papers.length;
      renderSidebar();
      updateDoneCount();
      await loadPaperAt(0);
    } catch (e) {
      console.error('启动失败:', e);
      $('#inner').innerHTML = '<div class="card" role="alert"><p>加载失败：' + escHtml(e.message) + '</p></div>';
      $('#progressText').textContent = '题库加载失败，请刷新重试';
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

  function refreshYears(selectedYear = currentPaper?.year) {
    const list = papers.filter(p => p.paper === activeCat).sort((a, b) => b.year - a.year);
    $('#years').innerHTML = list.map(p => {
      return `<button class="year-btn${p.year === selectedYear ? ' active' : ''}" data-year="${p.year}">${p.year}</button>`;
    }).join('');
    $('#years').onclick = e => {
      const btn = e.target.closest('.year-btn');
      if (!btn) return;
      const yr = +btn.dataset.year;
      loadPaperByYear(yr);
    };
  }

  /* ── load paper ──────────────────────────── */
  async function loadPaperByYear(year) {
    const p = papers.find(x => x.paper === activeCat && x.year === year);
    if (!p) return;
    await loadPaper(p);
  }

  async function loadPaper(p) {
    const sequence = ++loadSequence;
    closeScore();
    currentPaper = null;
    currentQIndex = 0;
    answers = {};
    submitted = new Set();
    activeCat = p.paper;
    $$('.cat-btn').forEach(b => b.classList.toggle('active', b.dataset.cat === p.paper));
    refreshYears(p.year);
    updateDoneCount();
    renderNavButtons();
    $('#progressText').textContent = `正在加载 ${p.paper} · ${p.year} …`;
    $('#inner').innerHTML = '<div class="card" role="status"><p>正在加载试卷…</p></div>';
    try {
      const data = await loadPaperJSON(p.file);
      // 连续切换年份/类别时，只接纳最后一次选择的响应。
      if (sequence !== loadSequence) return;
      if (!Array.isArray(data.questions) || !data.questions.length) throw new Error('试卷暂无题目');
      currentPaper = { ...p, questions: data.questions };
      renderQuestion();
    } catch (e) {
      if (sequence !== loadSequence) return;
      console.error('加载试卷失败:', e);
      $('#progressText').textContent = `${p.paper} · ${p.year} 加载失败`;
      $('#inner').innerHTML = '<div class="card" role="alert"><p>加载失败：' + escHtml(e.message) + '</p><p>请重新选择年份重试。</p></div>';
      renderNavButtons();
    }
  }

  async function loadPaperAt(idx) {
    const list = papers.filter(p => p.paper === activeCat).sort((a, b) => b.year - a.year);
    if (!list.length) return;
    await loadPaper(list[idx % list.length]);
  }

  /* ── render single question ─────────────── */
  function renderQuestion() {
    if (!currentPaper) return;
    const p = currentPaper;
    const q = p.questions[currentQIndex];
    if (!q) return;

    const total = p.questions.length;
    $('#progressText').textContent = `${p.year} · 第 ${currentQIndex + 1} / ${total} 题`;

    const isSubmitted = submitted.has(q.id);
    const userAns = answers[q.id];
    const showAnswers = isSubmitted || mode === 'read';
    const showAnalysis = submitted.size > 0 || mode === 'read';

    const diffLabel = q.difficulty === 0 ? '基础' : q.difficulty === 1 ? '中等' : '困难';

    const optionsHtml = isChoiceQuestion(q)
      ? Object.entries(q.options).map(([k, v]) => {
          const cls = [];
          if (showAnswers) {
            if (k === q.answer) cls.push('correct');
            else if (k === userAns) cls.push('wrong');
            cls.push('disabled');
          }
          if (userAns === k) cls.push('selected');
          const badge = !showAnswers ? '' : k === q.answer ? '正确答案' : k === userAns ? '你的选择' : '';
          return `<button type="button" class="opt ${cls.join(' ')}" data-key="${k}" data-qid="${q.id}" aria-pressed="${userAns === k}" ${showAnswers ? 'disabled' : ''}>
            <span class="opt__marker">${k}</span>
            <span class="opt__text render-me">${renderRich(v)}</span>
            <span class="opt__badge">${badge}</span>
          </button>`;
        }).join('')
      : `<div class="meta" style="margin-bottom:1rem">本题为${escHtml(q.type)}，不计入自动评分；可在「纯浏览」中查看答案与解析。</div>`;

    /* 有解析就展示解析；没有解析但有答案时，仍要把答案给出来
       （数学一 1990 第 1 题站方本身无解析文字，旧代码会整块吞掉，用户看到空卡片）。 */
    const analysisHtml = (q.analysis || q.answer)
      ? `<div class="analysis${showAnalysis ? ' visible' : ''}" id="analysis"${showAnalysis ? '' : ' hidden'}>
           ${q.analysis ? `<div class="analysis__label">【解析】</div>
           <div class="analysis__body render-me">${formatAnalysis(renderRich(q.analysis))}</div>` : ''}
           ${q.answer ? `<div class="analysis__answer">答案：${escHtml(q.answer)}</div>` : ''}
           ${q.key_point ? `<div class="analysis__key">关键点：${escHtml(q.key_point)}</div>` : ''}
           ${q.pitfalls && q.pitfalls.length ? `<div class="analysis__pitfalls">${q.pitfalls.map(p => `<div class="pitfall">⚠ ${escHtml(p)}</div>`).join('')}</div>` : ''}
         </div>`
      : '';

    const stemHtml = `<div class="card__stem render-me">${renderRich(q.stem)}</div>`;

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
      $$('.opt').forEach(o => {
        o.classList.toggle('selected', o === opt);
        o.setAttribute('aria-pressed', String(o === opt));
      });
    };

    // nav buttons
    $$('[data-nav]').forEach(b => b.onclick = () => {
      if (b.dataset.nav === 'prev') goPrev();
      else goNext();
    });
    renderNavButtons();
    // render katex —— 不能只挂在 requestAnimationFrame 上：
    // 后台标签页 / 最小化窗口不触发 rAF，公式会一直停在 $...$ 原文，
    // 直到用户切回前台。改为直接渲染，rAF 仅作二次兜底。
    renderMath();
    requestAnimationFrame(renderMath);

    // scroll to top
    $('#canvas').scrollTop = 0;
  }

  /* ── submit / grade ──────────────────────── */
  function isChoiceQuestion(q) {
    return Boolean(q?.options && Object.keys(q.options).length);
  }

  function submitPaper() {
    if (!currentPaper?.questions || mode !== 'quiz') return;
    const choiceQuestions = currentPaper.questions.filter(isChoiceQuestion);
    if (!choiceQuestions.length) return;

    let correct = 0;
    let wrong = 0;
    let blank = 0;
    for (const q of choiceQuestions) {
      submitted.add(q.id);
      if (!answers[q.id]) blank++;
      else if (answers[q.id] === q.answer) correct++;
      else wrong++;
    }

    const score = Math.round(correct / choiceQuestions.length * 100);
    updateDoneCount();
    renderQuestion();
    showScore({ score, correct, wrong, blank, total: choiceQuestions.length });
  }

  function showScore(result) {
    const dialog = $('#scoreDialog');
    if (!dialog) return;
    $('#scoreValue').textContent = result.score;
    $('#scoreCorrect').textContent = result.correct;
    $('#scoreWrong').textContent = result.wrong;
    $('#scoreBlank').textContent = result.blank;
    $('#scoreSummary').textContent = `${currentPaper.year} ${currentPaper.paper} · 共 ${result.total} 道选择题`;
    $('#reviewBtn').textContent = result.correct === result.total ? '查看解析' : '查看错题';
    if (!dialog.open) dialog.showModal();
    dialog.scrollTop = 0;
    document.body.classList.add('dialog-open');
    $('#reviewBtn').focus();
  }

  function closeScore() {
    const dialog = $('#scoreDialog');
    if (!dialog?.open) return;
    dialog.close();
    document.body.classList.remove('dialog-open');
    if (!$('#submitBtn').disabled) $('#submitBtn').focus();
  }

  function reviewFirstMistake() {
    const index = currentPaper?.questions?.findIndex(q => isChoiceQuestion(q) && answers[q.id] !== q.answer) ?? -1;
    closeScore();
    currentQIndex = index >= 0 ? index : Math.max(0, currentPaper.questions.findIndex(isChoiceQuestion));
    renderQuestion();
  }

  function retryPaper() {
    answers = {};
    submitted = new Set();
    currentQIndex = currentPaper?.questions?.findIndex(isChoiceQuestion) ?? 0;
    if (currentQIndex < 0) currentQIndex = 0;
    updateDoneCount();
    closeScore();
    renderQuestion();
  }

  /* ── nav ─────────────────────────────────── */
  function goPrev() {
    if (currentQIndex <= 0) return;
    currentQIndex--;
    renderQuestion();
  }

  function goNext() {
    const total = currentPaper?.questions?.length || 0;
    if (!total || currentQIndex >= total - 1) return;
    currentQIndex++;
    renderQuestion();
  }

  function renderNavButtons() {
    const total = currentPaper?.questions?.length || 0;
    const atStart = !total || currentQIndex === 0;
    const atEnd = !total || currentQIndex >= total - 1;
    $$('[data-nav="prev"], #prevBtn').forEach(button => { button.disabled = atStart; });
    $$('[data-nav="next"], #nextBtn').forEach(button => { button.disabled = atEnd; });
    const choices = currentPaper?.questions?.filter(isChoiceQuestion).length || 0;
    const submit = $('#submitBtn');
    submit.disabled = !choices || mode !== 'quiz';
    submit.style.display = mode === 'read' ? 'none' : '';
    submit.textContent = submitted.size ? '查看成绩' : '交卷';
    submit.title = !choices ? '本卷没有可自动批阅的选择题' : '统一批阅本卷选择题（Ctrl / ⌘ + Enter）';
  }

  /* ── keyboard ────────────────────────────── */
  document.addEventListener('keydown', e => {
    // 原生 dialog 负责焦点约束与 Esc 关闭，弹窗内不触发切题快捷键。
    if ($('#scoreDialog')?.open || e.defaultPrevented) return;
    if (e.target.closest('input, textarea, select, [contenteditable]')) return;
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && mode === 'quiz') {
      e.preventDefault();
      submitPaper();
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'ArrowLeft' || e.key === 'j' || e.key === 'J') {
      e.preventDefault();
      goPrev();
    }
    if (e.key === 'ArrowRight' || e.key === 'k' || e.key === 'K') {
      e.preventDefault();
      goNext();
    }
  });

  $('#prevBtn')?.addEventListener('click', goPrev);
  $('#nextBtn')?.addEventListener('click', goNext);
  $('#submitBtn')?.addEventListener('click', submitPaper);
  $('#scoreDialog')?.addEventListener('click', e => {
    const dialog = $('#scoreDialog');
    if (e.target.closest('[data-score-close]') || e.target === dialog) closeScore();
  });
  $('#scoreDialog')?.addEventListener('cancel', e => {
    e.preventDefault();
    closeScore();
  });
  $('#scoreDialog')?.addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;
    const buttons = e.currentTarget.querySelectorAll('button:not(:disabled)');
    const first = buttons[0];
    const last = buttons[buttons.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });
  $('#scoreDialog')?.addEventListener('close', () => {
    if (!$('#scoreDialog').open) document.body.classList.remove('dialog-open');
  });
  $('#reviewBtn')?.addEventListener('click', reviewFirstMistake);
  $('#retryBtn')?.addEventListener('click', retryPaper);
  /* ── mode toggle ─────────────────────────── */
  $$('.mode-tab').forEach(btn => {
    btn.onclick = () => {
      $$('.mode-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      mode = btn.dataset.mode;
      renderNavButtons();
      renderQuestion();
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

  /* 渲染 #inner 里的 LaTeX。KaTeX 会跳过已带 .katex 的节点，重复调用安全。 */
  function renderMath() {
    if (typeof renderMathInElement !== 'function') return;
    const host = $('#inner');
    if (!host) return;
    renderMathInElement(host, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false },
      ],
      throwOnError: false
    });
  }

  /* ── helpers ─────────────────────────────── */
  function escHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* 题干/选项/解析里夹着 markdown 图片 ![alt](src)。
     必须在 escHtml 之后调用：此时 " 已是 &quot;，src/alt 无法逃出属性。
     src 再做一次白名单校验，只放行本仓库 assets/ 下的相对路径。 */
  function renderImages(escaped) {
    return String(escaped).replace(
      /!\[([^\]]*)\]\(([^)\s]+)\)/g,
      (whole, alt, src) => {
        if (!/^assets\/[\w./-]+$/.test(src)) return whole;
        return `<img class="fig" src="${src}" alt="${alt}" loading="lazy" decoding="async">`;
      }
    );
  }

  /* 转义 + 图片，供题干与选项使用 */
  function renderRich(s) {
    return renderImages(escHtml(s));
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

  renderNavButtons();
  boot();
})();
