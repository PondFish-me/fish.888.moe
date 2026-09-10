# 考研数学真题 · 墨·题库

**数学一 | 数学二 | 数学三** — 1987~2026 共 120 套卷 · 2185 题全收录

## 快速开始（本地预览）

```bash
# 安装轻量服务器（Python 3 自带）
cd .scratch
python -m http.server 8080
# 浏览器打开 http://localhost:8080
```

或用 Node：

```bash
npx serve .scratch
```

## 部署到 GitHub Pages

1. 新建仓库 `github.com/<you>/math-exam`（Public）
2. 把以下文件全部提交到仓库根目录（**不是 .scratch 子目录**）

```
index.html
css/
  style.css
js/
  app.js
  katex/
    katex.min.css
    katex.min.js
    auto-render.min.js
data/
  index.json
  数学一/*.json
  数学二/*.json
  数学三/*.json
```

3. GitHub → Settings → Pages → Source: `main` branch `/ (root)` → Save
4. 5~10 分钟后访问 `https://<you>.github.io/math-exam`

> 提示：KaTeX CDN 也可改为 unpkg/jsDelivr，如需离线使用请把 `katex/` 目录完整放进仓库。

## 功能

- 按类别（数一/数二/数三）+ 年份选卷
- 单题阅读（ stem + 选项 + 答案 + 详细解析）
- 刷题模式：选择作答 → 交卷 → 高亮对错 → 朱砂线展开解析
- 进度自动保存到 localStorage
- 键盘 ← → 切题，J/K 上一题/下一题
- 响应式 + 尊重 `prefers-reduced-motion`
