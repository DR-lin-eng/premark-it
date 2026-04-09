# Markdown-It Compatible Rewrite

This workspace now targets full `markdown-it` compatibility by using the official parser and test surface as the baseline, then adding a small Pretext-inspired extension on top.

## What is compatible

- Public constructor and preset behavior
- Core, block, inline, renderer, token, ruler, helpers, and utils APIs
- CommonMark and markdown-it fixture behavior covered by the official upstream tests copied into `test/`
- Plugin loading and rule enable/disable behavior

## Pretext-inspired additions

On top of standard `markdown-it`, this rewrite adds:

```js
const md = markdownit()
const prepared = md.prepare('# title')

const tokens = md.parse(prepared)
const html = md.render(prepared)
```

`prepare()` precomputes tokens once so repeated parse/render calls can reuse the same analysis result.

The repository also now ships an experimental browser-only text layout module at [`prelayout/index.mjs`](./prelayout/index.mjs). It exposes:

- `prepareText()`
- `prepareRichText()`
- `layout()`
- `layoutWithLines()`
- `layoutNextLine()`
- `walkLineRanges()`
- `materializeLineRange()`
- `profilePrepare()`

This module is designed for prepare-time measurement plus arithmetic-only resize work, closer to the architecture used by `pretext`.

For browser embedding, the demo build now also produces a low-code global bundle at `demo-dist/assets/premark-it-editorial.js`. It exposes `window.PremarkItEditorial`, including:

- `PremarkItEditorial.render(target, markdown, options)`
- `PremarkItEditorial.md\`\``
- `PremarkItEditorial.upgradeAll()`
- `PremarkItEditorial.upgradeScriptNode(node)`
- `PremarkItEditorial.editorial(...)`
- `PremarkItEditorial.dynamicLayout(...)`
- `PremarkItEditorial.chat(...)`
- `PremarkItEditorial.richText(...)`
- `PremarkItEditorial.inlineFlow(...)`
- `PremarkItEditorial.bubbles(...)`
- `PremarkItEditorial.masonry(...)`
- `PremarkItEditorial.accordion(...)`
- `PremarkItEditorial.justification(...)`
- `PremarkItEditorial.ascii(...)`
- `PremarkItEditorial.lineBreak(...)`
- `PremarkItEditorial.prepareProfile(...)`
- `PremarkItEditorial.listCapabilities()`
- `PremarkItEditorial.snippet(markdown, options)`

Low-code custom-element usage:

```html
<script src="./assets/premark-it-editorial.js"></script>

<premark-editorial capability="editorial-engine" locale="zh-CN">
# 标题

这里是一段 Markdown，它会在浏览器里直接排成 editorial 风格。
</premark-editorial>
```

Source-linked usage:

```html
<script src="./assets/premark-it-editorial.js"></script>

<script id="story-source" type="text/markdown">
# 标题

这段 Markdown 会从独立节点中读取。
</script>

<premark-editorial
  capability="dynamic-layout"
  source="#story-source"
></premark-editorial>
```

Auto-script usage:

```html
<script src="./assets/premark-it-editorial.js"></script>

<script
  type="text/premark-editorial"
  capability="markdown-chat"
  locale="en"
>
User: Hello
Assistant: This block is auto-upgraded after the script bundle loads.
</script>
```

Function-wrapper usage:

```html
<div id="hero"></div>
<script src="./assets/premark-it-editorial.js"></script>
<script>
  PremarkItEditorial.render(
    '#hero',
    PremarkItEditorial.md`
# Hello

This block is rendered directly from Markdown.
`,
    { capability: 'dynamic-layout', locale: 'en' }
  )
</script>
```

Shortcut helper usage:

```html
<div id="chat"></div>
<script src="./assets/premark-it-editorial.js"></script>
<script>
  PremarkItEditorial.chat(
    '#chat',
    PremarkItEditorial.md`
User: Hello
Assistant: This bubble layout is rendered from Markdown.
`
  )
</script>
```

## GitHub demo

The repository now includes:

- a browser demo in [`demo/index.html`](./demo/index.html)
- an accuracy harness in [`demo/accuracy.html`](./demo/accuracy.html)
- a low-code capability showcase in [`demo/editorial-engine.html`](./demo/editorial-engine.html)
- a GitHub Pages workflow in [`.github/workflows/demo-pages.yml`](./.github/workflows/demo-pages.yml)

The demo supports i18n for English and Simplified Chinese, defaults to the browser locale, and allows manual switching in the UI. Dynamic mode now renders a continuous editorial flow with a side rail for figures/notes instead of the previous card waterfall.

Once the repository is on GitHub and Pages is configured to deploy from GitHub Actions, pushes to `main` or `master` will:

- install dependencies
- run the full compatibility test suite
- build the demo into `demo-dist/`
- install Playwright browsers
- run browser accuracy smoke tests
- publish the demo to GitHub Pages

Build the demo locally with:

```bash
npm run build:demo
```

That produces a static site in `demo-dist/` which can be uploaded or previewed with any static file server.

## Run tests locally

```bash
npm install
npm test
```

## Run browser accuracy tests locally

```bash
npm run build:demo
npx playwright install chromium firefox webkit
npm run test:browser
```

This smoke test opens the built demo in Chromium, Firefox, and WebKit, checks that the accuracy lab renders fixture rows, and verifies that resize work in dynamic mode does not introduce additional synchronous `getBoundingClientRect()` reads after prepare time.

## Run tests with Docker

```bash
docker build -t markdown-it-pretext-compatible .
docker run --rm markdown-it-pretext-compatible
```
