export const BROWSER_STYLES = `
:host, .premark-editorial-root {
  --premark-bg: linear-gradient(180deg, #f8fbff 0%, #f5f7fc 100%);
  --premark-surface: rgba(255,255,255,0.82);
  --premark-surface-strong: rgba(255,255,255,0.96);
  --premark-line: rgba(60,60,67,0.14);
  --premark-text: #111114;
  --premark-soft: #5f6570;
  --premark-blue: #0071e3;
  --premark-shadow-lg: 0 24px 64px rgba(15, 23, 42, 0.12);
  --premark-shadow-md: 0 12px 28px rgba(15, 23, 42, 0.08);
  --premark-radius-xl: 28px;
  --premark-radius-lg: 22px;
  --premark-radius-md: 16px;
  --premark-ui: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif;
  --premark-mono: "SF Mono", SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  color: var(--premark-text);
  font-family: var(--premark-ui);
}

.premark-editorial-root {
  position: relative;
  display: block;
  min-height: 240px;
  padding: 22px;
  border-radius: var(--premark-radius-xl);
  border: 1px solid rgba(255,255,255,0.7);
  background:
    radial-gradient(circle at top left, rgba(10, 132, 255, 0.12), transparent 24%),
    radial-gradient(circle at top right, rgba(90, 200, 250, 0.1), transparent 22%),
    var(--premark-bg);
  box-shadow: var(--premark-shadow-lg);
  backdrop-filter: blur(30px) saturate(180%);
  -webkit-backdrop-filter: blur(30px) saturate(180%);
  overflow: hidden;
}

.premark-editorial-root[data-capability="story"] {
  --premark-bg: linear-gradient(180deg, #f6f7fb 0%, #f7fbff 100%);
}

.premark-editorial-root[data-capability="docs"] {
  --premark-bg: linear-gradient(180deg, #f7f8fb 0%, #fbfcff 100%);
}

.premark-editorial-root[data-capability="compact"] {
  --premark-bg: linear-gradient(180deg, #f7f9fd 0%, #f5f7fb 100%);
}

.premark-status {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  padding: 0.36rem 0.66rem;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,0.72);
  background: rgba(255,255,255,0.74);
  color: var(--premark-soft);
  font-size: 12px;
  font-weight: 500;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.8);
}

.premark-rendered-stage {
  min-height: 180px;
}

.premark-editorial-root .dynamic-stage {
  position: relative;
}

.premark-editorial-root .stage-item {
  position: absolute;
  transition: transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 200ms ease;
}

.premark-editorial-root .stage-item-entering {
  opacity: 0;
  transform: translateY(10px);
}

.premark-editorial-root .stage-item-animating {
  will-change: transform;
}

.premark-editorial-root .stage-item-section-break {
  opacity: 0.9;
}

.premark-editorial-root .stage-item-rail-left .note-region,
.premark-editorial-root .stage-item-rail-left .feature-figure {
  transform: translateX(-8px);
}

.premark-editorial-root .stage-item-rail-right .note-region,
.premark-editorial-root .stage-item-rail-right .feature-figure {
  transform: translateX(8px);
}

.premark-editorial-root .flow-frame {
  position: relative;
}

.premark-editorial-root .flow-line {
  position: absolute;
  left: 0;
  right: 0;
  white-space: pre;
  font-family: var(--premark-ui);
}

.premark-editorial-root .flow-line span {
  white-space: pre;
}

.premark-editorial-root .flow-line a {
  color: var(--premark-blue);
  text-decoration: none;
}

.premark-editorial-root .flow-line code {
  font-family: var(--premark-mono);
  padding: 0.08em 0.36em;
  border-radius: 8px;
  background: rgba(118,118,128,0.12);
}

.premark-editorial-root .flow-line-heading {
  font-size: 34px;
  font-weight: 700;
  line-height: 40px;
  letter-spacing: -0.04em;
}

.premark-editorial-root .flow-line-lede {
  font-size: 22px;
  font-weight: 600;
  line-height: 30px;
  color: #2f3137;
}

.premark-editorial-root .flow-line-body {
  font-size: 17px;
  line-height: 27px;
}

.premark-editorial-root .flow-line-note {
  font-size: 15px;
  line-height: 24px;
  color: #5f6570;
}

.premark-editorial-root .flow-line-code {
  font-family: var(--premark-mono);
  font-size: 13px;
  line-height: 20px;
  color: #f2f2f7;
}

.premark-editorial-root .note-region,
.premark-editorial-root .feature-code,
.premark-editorial-root .feature-table-shell,
.premark-editorial-root .feature-html,
.premark-editorial-root .rendered-code-shell,
.premark-editorial-root .rendered-table-shell,
.premark-editorial-root .rendered-figure-block,
.premark-editorial-root .rendered-note,
.premark-editorial-root .rendered-list {
  border-radius: var(--premark-radius-lg);
  border: 1px solid rgba(255,255,255,0.72);
  background: var(--premark-surface);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.82), var(--premark-shadow-md);
}

.premark-editorial-root .note-region {
  padding: 18px;
  border-left: 3px solid rgba(10,132,255,0.3);
}

.premark-editorial-root .stage-item-rail-left .note-region {
  border-left: 1px solid rgba(255,255,255,0.72);
  border-right: 3px solid rgba(10,132,255,0.3);
}

.premark-editorial-root .feature-figure,
.premark-editorial-root .rendered-figure-block {
  margin: 0;
}

.premark-editorial-root .feature-figure img,
.premark-editorial-root .rendered-figure-block img,
.premark-editorial-root .rendered-article img {
  display: block;
  width: 100%;
  max-width: 100%;
  height: auto;
  border-radius: 20px;
  box-shadow: 0 16px 36px rgba(15, 23, 42, 0.1);
}

.premark-editorial-root .feature-figure figcaption {
  margin-top: 12px;
  color: var(--premark-soft);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.premark-editorial-root .feature-code {
  padding: 18px;
  background: linear-gradient(180deg, rgba(44,44,46,0.96), rgba(28,28,30,0.98));
  border-color: rgba(44,44,46,0.7);
}

.premark-editorial-root .feature-code .flow-line {
  color: #f2f2f7;
}

.premark-editorial-root .feature-code .flow-line code {
  background: transparent;
  padding: 0;
}

.premark-editorial-root .feature-code-label {
  margin-bottom: 14px;
  color: rgba(255,255,255,0.72);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.premark-editorial-root .feature-table-shell,
.premark-editorial-root .rendered-table-shell {
  overflow: hidden;
  padding: 12px;
}

.premark-editorial-root .feature-table,
.premark-editorial-root .rendered-article table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  background: var(--premark-surface-strong);
  border-radius: 16px;
  overflow: hidden;
}

.premark-editorial-root .feature-table th,
.premark-editorial-root .feature-table td,
.premark-editorial-root .rendered-article th,
.premark-editorial-root .rendered-article td {
  padding: 0.82rem 0.94rem;
  border-right: 1px solid rgba(60,60,67,0.12);
  border-bottom: 1px solid rgba(60,60,67,0.12);
  text-align: left;
  vertical-align: top;
  font-size: 15px;
  overflow-wrap: anywhere;
}

.premark-editorial-root .feature-table thead th,
.premark-editorial-root .rendered-article thead th {
  background: rgba(118,118,128,0.08);
}

.premark-editorial-root .feature-table tr:last-child td,
.premark-editorial-root .feature-table th:last-child,
.premark-editorial-root .feature-table td:last-child,
.premark-editorial-root .rendered-article tr:last-child td,
.premark-editorial-root .rendered-article th:last-child,
.premark-editorial-root .rendered-article td:last-child {
  border-bottom: 0;
  border-right: 0;
}

.premark-editorial-root .feature-html {
  padding: 22px;
}

.premark-editorial-root .rendered-article {
  width: min(100%, 880px);
  margin: 0 auto;
  padding: 6px 4px 24px;
}

.premark-editorial-root .rendered-article > * {
  margin-block: 0;
}

.premark-editorial-root .rendered-article > * + * {
  margin-top: 1rem;
}

.premark-editorial-root .rendered-article h1,
.premark-editorial-root .rendered-article h2,
.premark-editorial-root .rendered-article h3 {
  font-family: var(--premark-ui);
  color: var(--premark-text);
}

.premark-editorial-root .rendered-article h1 {
  font-size: 34px;
  line-height: 1.08;
  letter-spacing: -0.04em;
}

.premark-editorial-root .rendered-article h2 {
  font-size: 28px;
  line-height: 1.14;
  letter-spacing: -0.03em;
}

.premark-editorial-root .rendered-article h3 {
  font-size: 22px;
  line-height: 1.18;
  letter-spacing: -0.02em;
}

.premark-editorial-root .rendered-article p,
.premark-editorial-root .rendered-article li,
.premark-editorial-root .rendered-article blockquote,
.premark-editorial-root .rendered-article td,
.premark-editorial-root .rendered-article th,
.premark-editorial-root .rendered-article figcaption {
  font-family: var(--premark-ui);
}

.premark-editorial-root .rendered-article p,
.premark-editorial-root .rendered-article li {
  font-size: 16px;
  line-height: 1.65;
}

.premark-editorial-root .rendered-article .rendered-lede {
  margin-top: 14px;
  font-size: 20px;
  line-height: 1.5;
  font-weight: 500;
  color: var(--premark-soft);
}

.premark-editorial-root .rendered-article .rendered-section-title {
  position: relative;
  margin-top: 3rem;
  padding-top: 2.1rem;
}

.premark-editorial-root .rendered-article .rendered-section-title::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, rgba(60,60,67,0), rgba(60,60,67,0.16), rgba(60,60,67,0));
}

.premark-editorial-root .rendered-note,
.premark-editorial-root .rendered-article blockquote {
  margin: 1.2rem 0;
  padding: 1rem 1.05rem 1rem 1.15rem;
  border-left: 3px solid rgba(10,132,255,0.3);
  color: var(--premark-soft);
}

.premark-editorial-root .rendered-figure-block,
.premark-editorial-root .rendered-code-shell,
.premark-editorial-root .rendered-table-shell {
  margin-top: 1.4rem;
  padding: 12px;
}

.premark-editorial-root .rendered-code-shell pre,
.premark-editorial-root .rendered-table-shell table {
  margin: 0;
}

.premark-editorial-root .rendered-article pre,
.premark-editorial-root .premark-code-view {
  overflow: auto;
  margin: 0;
  padding: 18px;
  border-radius: 20px;
  background: #1c1c1e;
  color: #f2f2f7;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: var(--premark-mono);
}

.premark-editorial-root .rendered-list {
  margin-top: 1.15rem;
  padding: 0.9rem 1rem 0.95rem 1.45rem;
}

.premark-editorial-root .rendered-list li + li {
  margin-top: 0.45rem;
}

.premark-editorial-root .section-break {
  display: flex;
  align-items: center;
  gap: 14px;
  color: var(--premark-soft);
}

.premark-editorial-root .section-break-line {
  flex: 1 1 auto;
  height: 1px;
  background: linear-gradient(90deg, rgba(60,60,67,0), rgba(60,60,67,0.22), rgba(60,60,67,0));
}

.premark-editorial-root .section-break-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.premark-editorial-root .premark-demo-label {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  margin-bottom: 14px;
  padding: 0.34rem 0.68rem;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,0.7);
  background: rgba(255,255,255,0.74);
  color: var(--premark-soft);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.premark-editorial-root .premark-line {
  position: absolute;
  left: 0;
  right: 0;
  white-space: pre;
  font-family: var(--premark-ui);
}

.premark-editorial-root .premark-line span {
  white-space: pre;
}

.premark-editorial-root .premark-bubbles,
.premark-editorial-root .premark-chat,
.premark-editorial-root .premark-accordion,
.premark-editorial-root .premark-compare-grid,
.premark-editorial-root .premark-ascii-grid {
  display: grid;
  gap: 14px;
}

.premark-editorial-root .premark-bubble-row {
  display: flex;
}

.premark-editorial-root .premark-bubble-row.is-right {
  justify-content: flex-end;
}

.premark-editorial-root .premark-bubble {
  position: relative;
  padding: 14px 16px;
  border-radius: 22px;
  border: 1px solid rgba(255,255,255,0.72);
  background: rgba(255,255,255,0.78);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.82), var(--premark-shadow-md);
}

.premark-editorial-root .premark-bubble-row.is-right .premark-bubble {
  background: linear-gradient(180deg, rgba(10,132,255,0.94), rgba(0,113,227,0.94));
  border-color: rgba(0,113,227,0.44);
}

.premark-editorial-root .premark-bubble-row.is-right .premark-line {
  color: white;
}

.premark-editorial-root .premark-bubble-line {
  font-size: 16px;
  line-height: 24px;
}

.premark-editorial-root .premark-chat-row {
  display: flex;
}

.premark-editorial-root .premark-chat-row.role-user {
  justify-content: flex-end;
}

.premark-editorial-root .premark-chat-bubble {
  width: min(100%, 520px);
  padding: 14px 16px;
  border-radius: 22px;
  border: 1px solid rgba(255,255,255,0.72);
  background: rgba(255,255,255,0.8);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.82), var(--premark-shadow-md);
}

.premark-editorial-root .premark-chat-bubble.role-user {
  background: linear-gradient(180deg, rgba(10,132,255,0.94), rgba(0,113,227,0.94));
  color: white;
  border-color: rgba(0,113,227,0.44);
}

.premark-editorial-root .premark-chat-bubble.role-user a,
.premark-editorial-root .premark-chat-bubble.role-user code {
  color: white;
}

.premark-editorial-root .premark-chat-bubble p,
.premark-editorial-root .premark-chat-bubble li,
.premark-editorial-root .premark-chat-bubble blockquote,
.premark-editorial-root .premark-rich-copy {
  margin: 0;
  font-size: 15px;
  line-height: 1.6;
}

.premark-editorial-root .premark-chat-bubble > * + * {
  margin-top: 0.8rem;
}

.premark-editorial-root .premark-chat-bubble pre {
  margin: 0;
  padding: 14px;
  border-radius: 16px;
  background: rgba(28,28,30,0.92);
  color: #f2f2f7;
  overflow: auto;
}

.premark-editorial-root .premark-rich-card,
.premark-editorial-root .premark-ascii-card,
.premark-editorial-root .premark-compare-card,
.premark-editorial-root .premark-accordion-section,
.premark-editorial-root .premark-masonry-card {
  position: relative;
  border-radius: 22px;
  border: 1px solid rgba(255,255,255,0.72);
  background: rgba(255,255,255,0.76);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.82), var(--premark-shadow-md);
}

.premark-editorial-root .premark-rich-card {
  padding: 18px;
}

.premark-editorial-root .premark-rich-copy {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem 0.45rem;
  color: var(--premark-text);
}

.premark-editorial-root .premark-rich-copy code {
  font-family: var(--premark-mono);
  padding: 0.08em 0.4em;
  border-radius: 8px;
  background: rgba(118,118,128,0.12);
}

.premark-editorial-root .premark-chip {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0.32rem 0.72rem;
  border-radius: 999px;
  background: rgba(10,132,255,0.12);
  color: var(--premark-blue);
  font-size: 13px;
  font-weight: 600;
}

.premark-editorial-root .premark-masonry-stage {
  position: relative;
}

.premark-editorial-root .premark-masonry-card {
  position: absolute;
  overflow: hidden;
  padding: 16px 18px 18px;
}

.premark-editorial-root .premark-masonry-card h3,
.premark-editorial-root .premark-compare-card h3,
.premark-editorial-root .premark-ascii-card h3 {
  margin: 0 0 10px;
  font-size: 20px;
  line-height: 1.1;
  letter-spacing: -0.02em;
}

.premark-editorial-root .premark-masonry-index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  margin-bottom: 10px;
  border-radius: 999px;
  background: rgba(10,132,255,0.1);
  color: var(--premark-blue);
  font-size: 12px;
  font-weight: 700;
}

.premark-editorial-root .premark-masonry-body {
  color: var(--premark-soft);
  font-size: 15px;
  line-height: 1.55;
}

.premark-editorial-root .premark-accordion-section {
  overflow: hidden;
}

.premark-editorial-root .premark-accordion-trigger {
  width: 100%;
  padding: 16px 18px;
  border: 0;
  background: transparent;
  text-align: left;
  font-size: 17px;
  font-weight: 700;
  color: var(--premark-text);
}

.premark-editorial-root .premark-accordion-panel {
  max-height: 0;
  overflow: hidden;
  transition: max-height 220ms ease;
}

.premark-editorial-root .premark-accordion-section.is-open .premark-accordion-panel {
  max-height: var(--panel-height, 220px);
}

.premark-editorial-root .premark-accordion-content {
  padding: 0 18px 18px;
  color: var(--premark-soft);
}

.premark-editorial-root .premark-compare-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.premark-editorial-root .premark-compare-card {
  padding: 16px;
}

.premark-editorial-root .premark-css-justify,
.premark-editorial-root .premark-tight-copy {
  margin: 0;
  font-size: 15px;
  line-height: 1.6;
  color: var(--premark-soft);
}

.premark-editorial-root .premark-css-justify {
  text-align: justify;
}

.premark-editorial-root .premark-compare-line {
  font-size: 15px;
  line-height: 24px;
}

.premark-editorial-root .premark-ascii-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.premark-editorial-root .premark-ascii-card {
  padding: 16px;
}

.premark-editorial-root .premark-ascii-board {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(24px, 1fr));
  gap: 8px;
  padding: 12px;
  border-radius: 18px;
  background: rgba(118,118,128,0.08);
}

.premark-editorial-root .premark-ascii-board.proportional {
  font-family: var(--premark-ui);
}

.premark-editorial-root .premark-ascii-board.mono {
  font-family: var(--premark-mono);
}

.premark-editorial-root .premark-ascii-proportional-char,
.premark-editorial-root .premark-ascii-mono-char {
  display: grid;
  place-items: center;
  min-height: 48px;
  border-radius: 14px;
  background: rgba(255,255,255,0.78);
  border: 1px solid rgba(255,255,255,0.72);
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.04em;
}

@media (max-width: 760px) {
  .premark-editorial-root {
    padding: 16px;
  }

  .premark-editorial-root .flow-line-heading {
    font-size: 28px;
    line-height: 34px;
  }

  .premark-editorial-root .flow-line-lede {
    font-size: 20px;
    line-height: 28px;
  }

  .premark-editorial-root .flow-line-body {
    font-size: 16px;
    line-height: 24px;
  }

  .premark-editorial-root .premark-compare-grid,
  .premark-editorial-root .premark-ascii-grid {
    grid-template-columns: 1fr;
  }
}
`
