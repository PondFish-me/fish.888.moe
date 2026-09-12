/* 首屏绘制前应用主题；仅记忆用户的显示偏好，不存储作答记录。 */
(() => {
  'use strict';
  const key = 'moti-theme';
  const root = document.documentElement;
  const system = window.matchMedia('(prefers-color-scheme: dark)');
  let preference = null;
  try {
    const saved = localStorage.getItem(key);
    if (saved === 'light' || saved === 'dark') preference = saved;
  } catch { /* 禁用本地存储时，仍允许本次访问内切换。 */ }

  function applyTheme(theme) {
    root.dataset.theme = theme;
    const button = document.getElementById('themeToggle');
    if (!button) return;
    const label = theme === 'dark' ? '日间模式' : '夜间模式';
    button.setAttribute('aria-label', '切换到' + label);
    button.title = '切换到' + label;
    button.querySelector('.theme-label').textContent = label;
  }

  function applyPreference() {
    applyTheme(preference || (system.matches ? 'dark' : 'light'));
  }

  applyPreference();
  system.addEventListener('change', () => {
    if (!preference) applyPreference();
  });

  document.addEventListener('DOMContentLoaded', () => {
    applyPreference();
    document.getElementById('themeToggle').addEventListener('click', () => {
      preference = root.dataset.theme === 'dark' ? 'light' : 'dark';
      applyPreference();
      try { localStorage.setItem(key, preference); } catch { /* 显示切换不依赖写入成功。 */ }
    });
  }, { once: true });
})();
