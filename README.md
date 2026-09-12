# 考研数学真题 · 墨·题库

**数学一 | 数学二 | 数学三** — 1987~2026 共 120 套卷 · 2185 题全收录

纯静态站点，无构建步骤、无后端服务。KaTeX 及其数学字体随站点提供，界面字体可回退系统字体；本地 HTTP 预览不依赖公网。远程访问首次加载仍需要网络，目前未实现 Service Worker 离线缓存。

## 本地预览

双击仓库根目录的 **`start.bat`**（Windows）。它会起一个本地服务器并自动开浏览器。

手动启动也可以 —— 注意要在**仓库根目录**，不是子目录：

```bash
python -m http.server 8791 --bind 127.0.0.1
```

然后打开 <http://localhost:8791/>。

> 必须用 http 服务器打开，不能直接双击 `index.html`。页面用 `fetch()` 读取
> `data/*.json`，`file://` 协议下会被 CORS 拦掉。

## 部署到 GitHub Pages

1. 新建 **Public** 仓库，把仓库**根目录**的全部内容提交上去（不要套一层子目录）。
2. GitHub → Settings → Pages → Source: `main` branch `/ (root)` → Save。
3. 绑定自定义域名时，先在 Settings → Pages → Custom domain 填域名，再去
   DNS 服务商加一条 `CNAME` 记录指向 `<用户名>.github.io`，且**代理必须关闭**
   —— 开着代理会拦掉 Let's Encrypt 的 HTTP-01 校验，证书签不出来。

### 提交清单

漏掉任何一项都会在线上 404，而本地因为文件就在磁盘上、不经过网络，**看不出来**：

```
index.html
.nojekyll              ← 缺了它 GitHub 会跑 Jekyll，吃掉下划线开头的文件
CNAME                  ← 自定义域名，只在绑域名时需要
css/style.css
js/app.js
js/theme.js                           ← 首屏主题初始化与偏好记忆
assets/pondfish-logo.jpg               ← 主页右上角 Logo
js/katex/katex.min.css
js/katex/katex.min.js
js/katex/auto-render.min.js
js/katex/fonts/*.woff2 *.woff *.ttf   ← 60 个字体文件，katex.min.css 里按相对路径引用
assets/figures/*                      ← 题目里的函数图 / 几何图
data/index.json
data/数学一/*.json
data/数学二/*.json
data/数学三/*.json
```

> **大小写敏感**：GitHub Pages 跑在 Linux 上，Windows 本地不区分大小写。
> 文件名大小写对不上的引用，本地一切正常，上线后静默 404。

## 功能

- 按类别（数一/数二/数三）+ 年份选卷
- 单题阅读（题干 + 选项 + 答案 + 详细解析）
- 刷题模式：逐题作答 → 整卷交卷 → 自动批阅所有选择题 → 高亮对错并展开解析
- 成绩单展示答对、答错、未答；支持查看错题、重新作答与重复查看成绩
- 练习分 = 答对选择题数 ÷ 本卷选择题总数 × 100，四舍五入到整数；不含非选择题，也不是考研卷面总分
- 无选择题的试卷不提供自动交卷，可通过「纯浏览」查看答案与解析
- 日间/夜间模式：首次跟随系统，手动选择后在本地记忆，刷新后保留
- 右上角显示 PondFish Logo、GitHub 主页和 QQ 好友入口
- 顶部和题卡底部按钮均可切题，首尾自动禁用越界按钮
- 键盘 ← → 切题，J/K 上一题/下一题，Ctrl/⌘ + Enter 交卷，Esc 关闭成绩单
- 成绩单打开时隔离后台操作，Tab/Shift+Tab 在弹窗按钮间循环
- 响应式 + 尊重 `prefers-reduced-motion`

> 作答记录只存在当前试卷的内存状态中，刷新或切换试卷即清空；页头「本卷已批」也随切卷归零。仅主题偏好写入本地存储，没有账号、云端同步或累计学习记录。
