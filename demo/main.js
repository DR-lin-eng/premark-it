import markdownit from '../index.mjs'
import {
  composeDynamicLayout,
  computePreviewMetrics,
  prepareDynamicDocumentFromSource
} from './dynamic-layout.js'

const LOCALES = ['en', 'zh-CN']
const STORAGE_KEY = 'premark-it-demo-locale'
const LAYOUT_STORAGE_KEY = 'premark-it-demo-layout'
const BALANCE_STORAGE_KEY = 'premark-it-demo-layout-balance'
const metaDescription = document.querySelector('meta[name="description"]')
const initialSearch = new URLSearchParams(window.location?.search || '')
const dynamicPrepareCache = {
  textCache: new Map(),
  sourceBlockCache: new Map(),
  semanticCache: new Map(),
  blockCache: new Map(),
  documentState: {
    sourceBlocks: [],
    resolvedSourceBlocks: []
  }
}
const WORKSPACE_BREAKPOINT = 1120
const HANDLE_WIDTH = 18
const PAGE_PADDING_DESKTOP = 28
const PAGE_PADDING_MOBILE = 16

const MESSAGES = {
  en: {
    htmlLang: 'en',
    documentTitle: 'Premark-It Demo',
    metaDescription: 'A GitHub Pages demo for the fully compatible markdown-it rewrite with a Pretext-inspired prepare() cache.',
    eyebrow: 'GitHub Pages Demo',
    heroTitle: 'markdown-it compatibility, live in the browser.',
    heroText: 'This playground runs the local rewrite in-browser, shows rendered HTML, and demonstrates the extra <code>prepare()</code> cache layer.',
    heroPills: {
      prepare: 'Prepare-first',
      dynamic: 'Dynamic layout',
      i18n: 'English / 中文'
    },
    localeLabel: 'Language',
    localeAriaLabel: 'Language',
    localeOptions: {
      en: 'English',
      'zh-CN': 'Simplified Chinese'
    },
    packageVersionLabel: 'Package version',
    modesLabel: 'Modes',
    modeSummary: 'Preview, HTML, Tokens',
    inputKicker: 'Input',
    inputTitle: 'Markdown Source',
    resetSample: 'Reset sample',
    presetLabel: 'Preset',
    layoutLabel: 'Layout',
    templateLabel: 'Template',
    layoutBalanceLabel: 'Layout Balance',
    layoutOptions: {
      classic: 'Classic',
      dynamic: 'Dynamic'
    },
    templateOptions: {
      demo: 'Showcase',
      article: 'Editorial',
      docs: 'Docs'
    },
    templateCards: {
      demo: {
        kicker: 'Showcase',
        title: 'Parser Tour',
        body: 'A balanced sample with image, table, and code.'
      },
      article: {
        kicker: 'Editorial',
        title: 'Reading Flow',
        body: 'A narrative sample for lede, quote, and figure behavior.'
      },
      docs: {
        kicker: 'Docs',
        title: 'API Guide',
        body: 'A more structured sample for documentation-style output.'
      }
    },
    options: {
      html: 'Allow HTML',
      linkify: 'Linkify',
      typographer: 'Typographer',
      breaks: 'Hard breaks',
      xhtmlOut: 'XHTML output'
    },
    editorHint: {
      kicker: 'Editing Notes',
      classic: 'Classic mode shows the direct rendered HTML flow. Use it to inspect baseline parser output.',
      dynamic: 'Dynamic mode prepares layout in the background, then upgrades the preview when ready.'
    },
    textareaAriaLabel: 'Markdown input',
    textareaPlaceholder: 'Write Markdown here',
    outputKicker: 'Output',
    outputTitle: 'Live Result',
    outputViewAriaLabel: 'Output views',
    tabs: {
      preview: 'Preview',
      html: 'HTML',
      tokens: 'Tokens'
    },
    viewCaptions: {
      preview: 'Live rendered output with visual layout treatment.',
      html: 'The exact HTML string produced by the current parser configuration.',
      tokens: 'A readable token tree for debugging the parser pipeline.'
    },
    outputSummaries: {
      classic: 'Classic rendering shows the direct HTML flow for the selected template.',
      dynamicIdle: 'Dynamic mode is preparing a measured layout pass in the background.',
      dynamicReady: 'Dynamic layout is active and balancing content using cached prepare-time measurements.'
    },
    presentationToolbarLabel: 'Presentation Mode',
    copyPresentLink: 'Copy Preview Link',
    copyPresentLinkSuccess: 'Presentation link copied.',
    presentEnter: 'Present Preview',
    presentExit: 'Exit Preview',
    copyHtml: 'Copy HTML',
    copySuccess: 'HTML copied.',
    copyFailure: 'Clipboard unavailable in this browser.',
    layoutPreparing: 'Preparing dynamic layout...',
    layoutReady: 'Dynamic layout ready.',
    emptyState: 'Start typing Markdown to see the output.',
    stats: {
      lines: 'Lines',
      blockTokens: 'Block tokens',
      inlineTokens: 'Inline tokens',
      timing: 'Timing',
      layout: 'Layout',
      reuse: 'Reuse'
    },
    sampleTemplates: {
      demo: `# Premark-It Demo

This playground runs the **local parser build** and shows how the extra \`prepare()\` layer can be reused.

> “Smart quotes”, autolinks like https://github.com, and familiar Markdown-it behavior are all live here.

- CommonMark-compatible output
- Plugin-friendly core API
- Reusable token preparation

## Table support

| Feature | Status |
| --- | --- |
| \`render()\` | Ready |
| \`prepare()\` | Ready |
| GitHub demo | Ready |

## Image support

Here is a demo image rendered from the repository asset:

![Demo image](./assets/test.png)

\`\`\`js
import markdownit from "markdown-it-pretext-compatible";

const md = markdownit({ linkify: true, typographer: true });
const prepared = md.prepare("*Hello* from GitHub Pages");
console.log(md.render(prepared));
\`\`\`

Inline HTML stays escaped by default: <span>safe</span>.
`,
      article: `# Designing For Flow

The best demos don't just show a parser. They show how reading can feel editorial, responsive, and alive.

> Layout should react like a publication, not just a scroll of boxes.

![Editorial sample](./assets/test.png)

## Why this matters

- Readers scan before they read.
- Strong hierarchy creates orientation.
- Side rails help quotations and figures breathe.

Paragraphs should be allowed to wrap into calmer columns, while supporting content finds its own lane.

## Snapshot

| Element | Treatment |
| --- | --- |
| Lead paragraph | Larger rhythm |
| Figure | Hero or side rail |
| Quote | Note card |
| Data | Structured table |
`,
      docs: `# Premark-It Quickstart

Use this template to show parser output in a more documentation-oriented style.

## Install

\`\`\`bash
npm install markdown-it-pretext-compatible
\`\`\`

## Parse once, render many

\`\`\`js
import markdownit from "markdown-it-pretext-compatible";

const md = markdownit({ linkify: true, typographer: true });
const prepared = md.prepare("# hello");

console.log(md.parse(prepared));
console.log(md.render(prepared));
\`\`\`

## Capabilities

| API | Purpose |
| --- | --- |
| \`prepare()\` | cache token work |
| \`render()\` | output HTML |
| Dynamic demo | browser layout showcase |

![Docs sample](./assets/test.png)
`
    }
  },
  'zh-CN': {
    htmlLang: 'zh-CN',
    documentTitle: 'Premark-It 演示',
    metaDescription: '一个运行在 GitHub Pages 上的演示页，用于展示这版完全兼容 markdown-it 的重写实现和额外的 prepare() 缓存层。',
    eyebrow: 'GitHub Pages 演示',
    heroTitle: '在浏览器里直接体验 markdown-it 兼容实现。',
    heroText: '这个演示会在浏览器中运行本地重写实现，展示渲染后的 HTML，并演示额外的 <code>prepare()</code> 缓存层。',
    heroPills: {
      prepare: '先 prepare',
      dynamic: '动态布局',
      i18n: 'English / 中文'
    },
    localeLabel: '语言',
    localeAriaLabel: '语言',
    localeOptions: {
      en: 'English',
      'zh-CN': '简体中文'
    },
    packageVersionLabel: '包版本',
    modesLabel: '视图',
    modeSummary: '预览、HTML、令牌',
    inputKicker: '输入',
    inputTitle: 'Markdown 源文',
    resetSample: '重置示例',
    presetLabel: '预设',
    layoutLabel: '布局',
    templateLabel: '模板',
    layoutBalanceLabel: '布局比例',
    layoutOptions: {
      classic: '经典',
      dynamic: '动态'
    },
    templateOptions: {
      demo: '展示',
      article: '文章',
      docs: '文档'
    },
    templateCards: {
      demo: {
        kicker: '展示',
        title: '解析器总览',
        body: '包含图片、表格和代码的平衡示例。'
      },
      article: {
        kicker: '文章',
        title: '阅读流动感',
        body: '更适合观察导言、引用和图片编排效果。'
      },
      docs: {
        kicker: '文档',
        title: 'API 指南',
        body: '更适合展示文档风格的结构化输出。'
      }
    },
    options: {
      html: '允许 HTML',
      linkify: '自动链接',
      typographer: '排版增强',
      breaks: '强制换行',
      xhtmlOut: 'XHTML 输出'
    },
    editorHint: {
      kicker: '编辑提示',
      classic: '经典模式会直接显示渲染后的 HTML 流，用来观察解析器的基础输出。',
      dynamic: '动态模式会先在后台准备版式，然后在准备完成后升级预览。'
    },
    textareaAriaLabel: 'Markdown 输入',
    textareaPlaceholder: '在这里输入 Markdown',
    outputKicker: '输出',
    outputTitle: '实时结果',
    outputViewAriaLabel: '输出视图',
    tabs: {
      preview: '预览',
      html: 'HTML',
      tokens: '令牌'
    },
    viewCaptions: {
      preview: '展示当前内容的渲染结果和版式表现。',
      html: '展示当前解析配置实际生成的 HTML 字符串。',
      tokens: '展示更适合调试的 token 结构树。'
    },
    outputSummaries: {
      classic: '经典模式会直接展示当前模板对应的 HTML 流式渲染结果。',
      dynamicIdle: '动态模式正在后台准备带度量信息的版式结果。',
      dynamicReady: '动态布局已启用，并会基于 prepare 阶段缓存的度量结果平衡内容。'
    },
    presentationToolbarLabel: '展示模式',
    copyPresentLink: '复制展示链接',
    copyPresentLinkSuccess: '展示链接已复制。',
    presentEnter: '全屏预览',
    presentExit: '退出预览',
    copyHtml: '复制 HTML',
    copySuccess: 'HTML 已复制。',
    copyFailure: '当前浏览器无法访问剪贴板。',
    layoutPreparing: '正在准备动态布局...',
    layoutReady: '动态布局已就绪。',
    emptyState: '开始输入 Markdown，就能看到实时渲染结果。',
    stats: {
      lines: '行数',
      blockTokens: '块级令牌',
      inlineTokens: '行内令牌',
      timing: '耗时',
      layout: '布局',
      reuse: '复用'
    },
    sampleTemplates: {
      demo: `# Premark-It 演示

这个页面会在浏览器里运行**本地解析器构建**，并展示额外的 \`prepare()\` 缓存层如何复用。

> “智能引号”、像 https://github.com 这样的自动链接，以及熟悉的 Markdown-it 行为，都可以在这里直接看到。

- CommonMark 兼容输出
- 插件友好的核心 API
- 可复用的 token 预处理

## 表格支持

| 功能 | 状态 |
| --- | --- |
| \`render()\` | 已就绪 |
| \`prepare()\` | 已就绪 |
| GitHub Demo | 已就绪 |

## 图片支持

下面这张图片来自仓库里的静态资源：

![演示图片](./assets/test.png)

\`\`\`js
import markdownit from "markdown-it-pretext-compatible";

const md = markdownit({ linkify: true, typographer: true });
const prepared = md.prepare("*来自 GitHub Pages 的问候*");
console.log(md.render(prepared));
\`\`\`

默认情况下，内联 HTML 仍会被转义：<span>安全</span>。
`,
      article: `# 为流动感而设计

好的 demo 不只是展示解析器，还应该展示阅读体验如何像被编排过一样流动起来。

> 布局应该像出版物一样响应，而不是一排排机械堆叠的盒子。

![文章示例](./assets/test.png)

## 为什么重要

- 读者会先扫描，再阅读。
- 清晰层级能快速建立方向感。
- 侧栏内容会让引用和图片更从容。

正文应该能获得更舒展的行宽，而补充内容则进入自己的叙事轨道。

## 版式快照

| 元素 | 处理方式 |
| --- | --- |
| 导言段 | 更大的阅读节奏 |
| 图片 | Hero 或侧栏 |
| 引用 | 注释卡片 |
| 数据 | 结构化表格 |
`,
      docs: `# Premark-It 快速开始

这个模板更适合展示文档型内容和 API 说明。

## 安装

\`\`\`bash
npm install markdown-it-pretext-compatible
\`\`\`

## 一次 prepare，多次 render

\`\`\`js
import markdownit from "markdown-it-pretext-compatible";

const md = markdownit({ linkify: true, typographer: true });
const prepared = md.prepare("# hello");

console.log(md.parse(prepared));
console.log(md.render(prepared));
\`\`\`

## 能力概览

| API | 用途 |
| --- | --- |
| \`prepare()\` | 缓存 token 工作 |
| \`render()\` | 输出 HTML |
| Dynamic demo | 浏览器布局展示 |

![文档示例](./assets/test.png)
`
    }
  }
}

const state = {
  view: 'preview',
  locale: detectLocale(),
  layoutMode: detectLayoutMode(),
  templateKey: detectTemplateKey(),
  outputRatio: detectOutputRatio(),
  presentationMode: detectPresentationMode(),
  dynamicPrepared: null,
  dynamicKey: '',
  renderToken: 0,
  dragPointerId: null,
  resizeFrame: 0,
  prepareHandle: 0,
  pendingDynamicLayout: false,
  lastDynamicCardMap: new Map()
}

const elements = {
  locale: document.querySelector('#locale-select'),
  preset: document.querySelector('#preset'),
  layoutMode: document.querySelector('#layout-mode'),
  templateSelect: document.querySelector('#template-select'),
  layoutBalance: document.querySelector('#layout-balance'),
  layoutBalanceValue: document.querySelector('#layout-balance-value'),
  handle: document.querySelector('#workspace-handle'),
  html: document.querySelector('#html'),
  linkify: document.querySelector('#linkify'),
  typographer: document.querySelector('#typographer'),
  breaks: document.querySelector('#breaks'),
  xhtmlOut: document.querySelector('#xhtmlOut'),
  input: document.querySelector('#markdown-input'),
  editorHintBody: document.querySelector('#editor-hint-body'),
  editorHintKicker: document.querySelector('.editor-hint-kicker'),
  editorModeChip: document.querySelector('#editor-mode-chip'),
  editorTemplateChip: document.querySelector('#editor-template-chip'),
  workspace: document.querySelector('.workspace'),
  outputPanel: document.querySelector('.output-panel'),
  preview: document.querySelector('#preview-view'),
  htmlView: document.querySelector('#html-view'),
  tokensView: document.querySelector('#tokens-view'),
  stats: document.querySelector('#stats-strip'),
  copyHtml: document.querySelector('#copy-html'),
  modeBadge: document.querySelector('#mode-badge'),
  templateBadge: document.querySelector('#template-badge'),
  viewBadge: document.querySelector('#view-badge'),
  presentationModeBadge: document.querySelector('#presentation-mode-badge'),
  presentationTemplateBadge: document.querySelector('#presentation-template-badge'),
  presentationViewBadge: document.querySelector('#presentation-view-badge'),
  presentationToolbarLabel: document.querySelector('.presentation-toolbar-label'),
  presentationToolbarExit: document.querySelector('#present-toolbar-exit'),
  copyPresentLink: document.querySelector('#copy-present-link'),
  outputSummary: document.querySelector('#output-summary'),
  layoutStatus: document.querySelector('#layout-status'),
  presentToggle: document.querySelector('#present-toggle'),
  copyStatus: document.querySelector('#copy-status'),
  resetSample: document.querySelector('#reset-sample'),
  viewCaption: document.querySelector('#view-caption'),
  tabs: Array.from(document.querySelectorAll('.tab-button')),
  templateButtons: Array.from(document.querySelectorAll('[data-template-button]')),
  panels: Array.from(document.querySelectorAll('[data-view-panel]')),
  tablist: document.querySelector('.tablist')
}

elements.locale.value = state.locale
elements.layoutMode.value = state.layoutMode
elements.templateSelect.value = state.templateKey
elements.layoutBalance.value = String(Math.round(state.outputRatio * 100))

applyLocale()
applyLayoutMode()
elements.input.value = currentTemplateSource()

function translate(path) {
  return path.split('.').reduce((value, part) => value?.[part], currentMessages())
}

function currentMessages() {
  return MESSAGES[state.locale]
}

function currentTemplateSource() {
  return currentMessages().sampleTemplates[state.templateKey]
}

function detectLocale() {
  const storedLocale = readStoredLocale()
  if (storedLocale) {
    return storedLocale
  }

  const browserLocales = [
    ...(navigator.languages || []),
    navigator.language
  ].filter(Boolean)

  return browserLocales.some((locale) => locale.toLowerCase().startsWith('zh'))
    ? 'zh-CN'
    : 'en'
}

function detectLayoutMode() {
  try {
    const value = localStorage.getItem(LAYOUT_STORAGE_KEY)
    return value === 'dynamic' ? 'dynamic' : 'classic'
  } catch {
    return 'classic'
  }
}

function detectTemplateKey() {
  try {
    const value = localStorage.getItem('premark-it-demo-template')
    return ['demo', 'article', 'docs'].includes(value) ? value : 'demo'
  } catch {
    return 'demo'
  }
}

function detectOutputRatio() {
  try {
    const value = Number(localStorage.getItem(BALANCE_STORAGE_KEY))
    if (Number.isFinite(value)) {
      return Math.min(0.7, Math.max(0.3, value))
    }
  } catch {}

  return 0.54
}

function detectPresentationMode() {
  return initialSearch.get('present') === '1'
}

function readStoredLocale() {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return LOCALES.includes(value) ? value : null
  } catch {
    return null
  }
}

function persistLocale(locale) {
  try {
    localStorage.setItem(STORAGE_KEY, locale)
  } catch {}
}

function persistLayoutMode(layoutMode) {
  try {
    localStorage.setItem(LAYOUT_STORAGE_KEY, layoutMode)
  } catch {}
}

function persistTemplateKey(templateKey) {
  try {
    localStorage.setItem('premark-it-demo-template', templateKey)
  } catch {}
}

function persistOutputRatio(outputRatio) {
  try {
    localStorage.setItem(BALANCE_STORAGE_KEY, String(outputRatio))
  } catch {}
}

function applyLocale() {
  const messages = currentMessages()

  document.documentElement.lang = messages.htmlLang
  document.title = messages.documentTitle
  metaDescription.setAttribute('content', messages.metaDescription)

  document.querySelectorAll('[data-i18n]').forEach((node) => {
    node.textContent = translate(node.dataset.i18n)
  })

  document.querySelectorAll('[data-i18n-html]').forEach((node) => {
    node.innerHTML = translate(node.dataset.i18nHtml)
  })

  elements.locale.options[0].textContent = messages.localeOptions.en
  elements.locale.options[1].textContent = messages.localeOptions['zh-CN']
  elements.layoutMode.options[0].textContent = messages.layoutOptions.classic
  elements.layoutMode.options[1].textContent = messages.layoutOptions.dynamic
  elements.templateSelect.options[0].textContent = messages.templateOptions.demo
  elements.templateSelect.options[1].textContent = messages.templateOptions.article
  elements.templateSelect.options[2].textContent = messages.templateOptions.docs
  elements.locale.setAttribute('aria-label', messages.localeAriaLabel)
  elements.input.setAttribute('aria-label', messages.textareaAriaLabel)
  elements.input.setAttribute('placeholder', messages.textareaPlaceholder)
  elements.tablist.setAttribute('aria-label', messages.outputViewAriaLabel)
  elements.handle.setAttribute('aria-label', messages.layoutBalanceLabel)
  elements.editorHintKicker.textContent = messages.editorHint.kicker
  elements.presentToggle.textContent = state.presentationMode ? messages.presentExit : messages.presentEnter
  elements.presentationToolbarLabel.textContent = messages.presentationToolbarLabel
  elements.presentationToolbarExit.textContent = messages.presentExit
  elements.copyPresentLink.textContent = messages.copyPresentLink
  updateLayoutBalanceLabel()
  updateTemplateButtons()
  updateViewCaption()
  updateEditorHint()
  updateOutputSummary()
  updateLayoutStatus()
}

function applyLayoutMode() {
  const dynamic = state.layoutMode === 'dynamic'
  const wide = dynamic && window.innerWidth > WORKSPACE_BREAKPOINT
  elements.workspace.classList.toggle('workspace-dynamic-mode', dynamic)
  elements.workspace.classList.toggle('workspace-dynamic-wide', wide)
  elements.preview.classList.toggle('rendered-view-dynamic-mode', dynamic)
  elements.layoutBalance.disabled = !dynamic
  elements.handle.classList.toggle('is-hidden', !wide)
  elements.workspace.style.setProperty('--editor-fr', `${(1 - state.outputRatio).toFixed(3)}fr`)
  elements.workspace.style.setProperty('--output-fr', `${state.outputRatio.toFixed(3)}fr`)
  elements.modeBadge.textContent = state.layoutMode
  elements.templateBadge.textContent = state.templateKey
  elements.viewBadge.textContent = state.view
  elements.presentationModeBadge.textContent = state.layoutMode
  elements.presentationTemplateBadge.textContent = state.templateKey
  elements.presentationViewBadge.textContent = state.view
  elements.editorModeChip.textContent = state.layoutMode
  elements.editorTemplateChip.textContent = state.templateKey
  updateLayoutBalanceLabel()
  updateTemplateButtons()
  updateEditorHint()
  updateOutputSummary()
}

function applyPresentationMode() {
  document.body.classList.toggle('presentation-mode', state.presentationMode)
  if (state.presentationMode) {
    state.view = 'preview'
  }
  updateViewSelection()
}

function updateLayoutBalanceLabel() {
  elements.layoutBalanceValue.textContent = `${Math.round(state.outputRatio * 100)}%`
}

function updateTemplateButtons() {
  elements.templateButtons.forEach((button) => {
    const active = button.dataset.templateButton === state.templateKey
    button.classList.toggle('is-active', active)
  })
}

function updateViewCaption() {
  elements.viewCaption.textContent = currentMessages().viewCaptions[state.view]
  elements.viewBadge.textContent = state.view
  elements.presentationViewBadge.textContent = state.view
}

function updateEditorHint() {
  const messages = currentMessages()
  elements.editorHintBody.textContent =
    state.layoutMode === 'dynamic'
      ? messages.editorHint.dynamic
      : messages.editorHint.classic
}

function updateOutputSummary() {
  const summaries = currentMessages().outputSummaries
  elements.outputSummary.textContent =
    state.layoutMode === 'dynamic'
      ? (state.pendingDynamicLayout ? summaries.dynamicIdle : summaries.dynamicReady)
      : summaries.classic
}

function createParser() {
  const preset = elements.preset.value
  const md = preset === 'default' ? markdownit() : markdownit(preset)

  md.set({
    html: elements.html.checked,
    linkify: elements.linkify.checked,
    typographer: elements.typographer.checked,
    breaks: elements.breaks.checked,
    xhtmlOut: elements.xhtmlOut.checked
  })

  return md
}

function simplifyToken(token) {
  return {
    type: token.type,
    tag: token.tag,
    nesting: token.nesting,
    level: token.level,
    content: token.content,
    markup: token.markup,
    info: token.info,
    attrs: token.attrs,
    hidden: token.hidden,
    children: token.children ? token.children.map(simplifyToken) : null
  }
}

function countInlineChildren(tokens) {
  return tokens.reduce((count, token) => {
    return count + (Array.isArray(token.children) ? token.children.length : 0)
  }, 0)
}

function renderStats(prepared, prepareDuration, renderDuration) {
  const labels = currentMessages().stats
  const reuseValue =
    state.layoutMode === 'dynamic' && state.dynamicPrepared?.cacheStats
      ? `P${state.dynamicPrepared.cacheStats.reusedPositionalBlocks} C${state.dynamicPrepared.cacheStats.reusedContentBlocks} M${state.dynamicPrepared.cacheStats.reusedMeasuredBlocks}`
      : 'n/a'
  const cards = [
    {
      label: labels.lines,
      value: String(elements.input.value.split('\n').length)
    },
    {
      label: labels.blockTokens,
      value: String(prepared.tokens.length)
    },
    {
      label: labels.inlineTokens,
      value: String(countInlineChildren(prepared.tokens))
    },
    {
      label: labels.layout,
      value: state.layoutMode === 'dynamic'
        ? `${elements.layoutMode.value} ${Math.round(state.outputRatio * 100)}%`
        : `${elements.layoutMode.value} / ${state.templateKey}`
    },
    {
      label: labels.reuse,
      value: reuseValue
    },
    {
      label: labels.timing,
      value: state.layoutMode === 'dynamic' && state.dynamicPrepared?.cacheStats
        ? `${prepareDuration.toFixed(2)}ms + ${renderDuration.toFixed(2)}ms / ${state.dynamicPrepared.cacheStats.changedSourceBlocks} changed`
        : `${prepareDuration.toFixed(2)}ms + ${renderDuration.toFixed(2)}ms`
    }
  ]

  elements.stats.innerHTML = cards
    .map((card) => {
      return `
        <div class="stat-card">
          <span class="stat-label">${card.label}</span>
          <span class="stat-value">${card.value}</span>
        </div>
      `
    })
    .join('')
}

function updateViewSelection() {
  elements.outputPanel.dataset.activeView = state.view

  elements.tabs.forEach((button) => {
    const active = button.dataset.view === state.view
    button.classList.toggle('is-active', active)
    button.setAttribute('aria-selected', active ? 'true' : 'false')
  })

  elements.panels.forEach((panel) => {
    const active = panel.dataset.viewPanel === state.view
    panel.classList.toggle('is-hidden', !active)
  })

  updateViewCaption()
}

function renderEmptyPreview() {
  const empty = `<div class="empty-state"><p>${currentMessages().emptyState}</p></div>`
  elements.preview.innerHTML = empty
  elements.htmlView.textContent = ''
  elements.tokensView.textContent = ''
  elements.stats.innerHTML = ''
  elements.layoutStatus.textContent = ''
  updateOutputSummary()
}

async function requestFullscreenIfAvailable() {
  const target = document.documentElement
  if (typeof target.requestFullscreen === 'function') {
    try {
      await target.requestFullscreen()
    } catch {}
  }
}

async function exitFullscreenIfNeeded() {
  if (document.fullscreenElement && typeof document.exitFullscreen === 'function') {
    try {
      await document.exitFullscreen()
    } catch {}
  }
}

function updatePresentationUrl() {
  if (!window.history?.replaceState || !window.location) {
    return
  }

  const url = new URL(window.location.href)
  if (state.presentationMode) {
    url.searchParams.set('present', '1')
  } else {
    url.searchParams.delete('present')
  }

  window.history.replaceState({}, '', url)
}

function presentationHref() {
  const url = new URL(window.location.href)
  url.searchParams.set('present', '1')
  return url.toString()
}

async function setPresentationMode(enabled, options = {}) {
  state.presentationMode = enabled
  applyPresentationMode()
  updatePresentationUrl()
  applyLocale()

  if (enabled && options.requestFullscreen !== false) {
    await requestFullscreenIfAvailable()
  }

  if (!enabled && options.exitFullscreen !== false) {
    await exitFullscreenIfNeeded()
  }
}

function scheduleIdleTask(callback) {
  if (typeof requestIdleCallback === 'function') {
    return requestIdleCallback(callback, { timeout: 150 })
  }

  return setTimeout(() => callback({ didTimeout: false, timeRemaining: () => 0 }), 0)
}

function cancelIdleTask(handle) {
  if (!handle) {
    return
  }

  if (typeof cancelIdleCallback === 'function') {
    cancelIdleCallback(handle)
    return
  }

  clearTimeout(handle)
}

function updateLayoutStatus() {
  elements.layoutStatus.textContent = state.pendingDynamicLayout
    ? currentMessages().layoutPreparing
    : (state.layoutMode === 'dynamic' && state.dynamicPrepared ? currentMessages().layoutReady : '')
  updateOutputSummary()
}

function dynamicCacheKey(source) {
  return JSON.stringify({
    source,
    locale: state.locale,
    preset: elements.preset.value,
    html: elements.html.checked,
    linkify: elements.linkify.checked,
    typographer: elements.typographer.checked,
    breaks: elements.breaks.checked,
    xhtmlOut: elements.xhtmlOut.checked
  })
}

function pagePaddingForViewport() {
  return window.innerWidth <= 760 ? PAGE_PADDING_MOBILE : PAGE_PADDING_DESKTOP
}

function currentPageWidth() {
  return Math.min(1440, window.innerWidth - pagePaddingForViewport() * 2)
}

function setOutputRatio(nextRatio) {
  state.outputRatio = Math.min(0.7, Math.max(0.3, nextRatio))
  elements.layoutBalance.value = String(Math.round(state.outputRatio * 100))
  persistOutputRatio(state.outputRatio)
  applyLayoutMode()
}

function updateRatioFromPointer(event) {
  if (window.innerWidth <= WORKSPACE_BREAKPOINT) {
    return
  }

  const pageWidth = currentPageWidth()
  const left = (window.innerWidth - pageWidth) / 2
  const usableWidth = pageWidth - HANDLE_WIDTH
  const editorWidth = Math.min(
    usableWidth * 0.7,
    Math.max(usableWidth * 0.3, event.clientX - left - HANDLE_WIDTH / 2)
  )
  const outputRatio = 1 - editorWidth / usableWidth

  setOutputRatio(outputRatio)
}

function stopWorkspaceDrag() {
  state.dragPointerId = null
  elements.handle.classList.remove('is-dragging')
}

function renderDynamicPreview(layout) {
  elements.preview.innerHTML = `
    <div class="dynamic-stage" style="height:${Math.ceil(layout.height)}px">
      ${layout.cards.map((card) => `
        <section
          class="${card.className}"
          data-card-key="${card.key}"
          style="left:${Math.round(card.x)}px;top:${Math.round(card.y)}px;width:${Math.round(card.width)}px;height:${Math.round(card.height)}px"
        >
          ${card.html}
        </section>
      `).join('')}
    </div>
  `

  const nextMap = new Map(layout.cards.map((card) => [card.key, card]))
  const stage = elements.preview.querySelector?.('.dynamic-stage')
  if (stage) {
    const cardNodes = stage.querySelectorAll?.('[data-card-key]') || []
    cardNodes.forEach((node) => {
      const key = node.dataset.cardKey
      const previous = state.lastDynamicCardMap.get(key)
      const next = nextMap.get(key)

      if (!previous || !next) {
        node.classList.add('dynamic-card-entering')
        requestAnimationFrame(() => {
          node.classList.remove('dynamic-card-entering')
        })
        return
      }

      const deltaX = previous.x - next.x
      const deltaY = previous.y - next.y

      if (deltaX === 0 && deltaY === 0) {
        return
      }

      node.style.transform = `translate(${deltaX}px, ${deltaY}px)`
      node.classList.add('dynamic-card-animating')

      requestAnimationFrame(() => {
        node.style.transform = ''
      })

      const cleanup = () => {
        node.classList.remove('dynamic-card-animating')
        node.removeEventListener('transitionend', cleanup)
      }

      node.addEventListener('transitionend', cleanup)
    })
  }

  state.lastDynamicCardMap = nextMap
}

function scheduleDynamicRecompose() {
  if (state.resizeFrame) {
    cancelAnimationFrame(state.resizeFrame)
  }

  state.resizeFrame = requestAnimationFrame(() => {
    state.resizeFrame = 0

    if (state.layoutMode !== 'dynamic' || !state.dynamicPrepared) {
      return
    }

    renderDynamicPreview(
      composeDynamicLayout(
        state.dynamicPrepared,
        computePreviewMetrics(window.innerWidth, window.innerHeight, state.outputRatio)
      )
    )
  })
}

async function ensureDynamicPrepared(source, md, renderToken) {
  const nextKey = dynamicCacheKey(source)

  if (state.dynamicPrepared && state.dynamicKey === nextKey) {
    return state.dynamicPrepared
  }

  const dynamicPrepared = await prepareDynamicDocumentFromSource({
    source,
    md,
    cache: dynamicPrepareCache
  })

  if (renderToken !== state.renderToken) {
    return null
  }

  state.dynamicPrepared = dynamicPrepared
  state.dynamicKey = nextKey
  return dynamicPrepared
}

async function refresh() {
  const source = elements.input.value
  const renderToken = ++state.renderToken
  cancelIdleTask(state.prepareHandle)
  state.prepareHandle = 0

  if (!source.trim()) {
    state.pendingDynamicLayout = false
    renderEmptyPreview()
    updateViewSelection()
    return
  }

  const md = createParser()
  const env = {}

  const prepareStart = performance.now()
  const prepared = md.prepare(source, env)
  const prepareDuration = performance.now() - prepareStart

  const renderStart = performance.now()
  const html = md.render(prepared)
  const renderDuration = performance.now() - renderStart

  if (renderToken !== state.renderToken) {
    return
  }

  elements.htmlView.textContent = html
  elements.tokensView.textContent = JSON.stringify(
    prepared.tokens.map(simplifyToken),
    null,
    2
  )

  if (state.layoutMode === 'dynamic') {
    const nextKey = dynamicCacheKey(source)

    if (state.dynamicPrepared && state.dynamicKey === nextKey) {
      state.pendingDynamicLayout = false
      updateLayoutStatus()
      const metrics = computePreviewMetrics(window.innerWidth, window.innerHeight, state.outputRatio)
      renderDynamicPreview(composeDynamicLayout(state.dynamicPrepared, metrics))
    } else {
      state.pendingDynamicLayout = true
      updateLayoutStatus()
      elements.preview.innerHTML = html

      state.prepareHandle = scheduleIdleTask(async () => {
        const preparedDynamic = await ensureDynamicPrepared(source, md, renderToken)
        if (!preparedDynamic || renderToken !== state.renderToken) {
          return
        }

        state.pendingDynamicLayout = false
        updateLayoutStatus()
        const metrics = computePreviewMetrics(window.innerWidth, window.innerHeight, state.outputRatio)
        renderDynamicPreview(composeDynamicLayout(preparedDynamic, metrics))
        renderStats(prepared, prepareDuration, renderDuration)
        updateViewSelection()
      })
    }
  } else {
    state.pendingDynamicLayout = false
    updateLayoutStatus()
    elements.preview.innerHTML = html
  }

  renderStats(prepared, prepareDuration, renderDuration)
  updateViewSelection()
}

elements.input.addEventListener('input', () => {
  state.dynamicPrepared = null
  refresh()
})

for (const element of [
  elements.locale,
  elements.layoutMode,
  elements.templateSelect,
  elements.layoutBalance,
  elements.preset,
  elements.html,
  elements.linkify,
  elements.typographer,
  elements.breaks,
  elements.xhtmlOut
]) {
  element.addEventListener('change', () => {
    let localeSwappedSample = false

    if (element === elements.locale) {
      const previousLocale = state.locale
      const shouldSwapSample =
        elements.input.value.trim().length === 0 ||
        elements.input.value === MESSAGES[previousLocale].sampleTemplates[state.templateKey]

      state.locale = elements.locale.value
      persistLocale(state.locale)
      applyLocale()

      if (shouldSwapSample) {
        elements.input.value = currentTemplateSource()
        localeSwappedSample = true
      }
    }

    if (element === elements.layoutMode) {
      state.layoutMode = elements.layoutMode.value
      persistLayoutMode(state.layoutMode)
      applyLayoutMode()
    }

    if (element === elements.templateSelect) {
      state.templateKey = elements.templateSelect.value
      persistTemplateKey(state.templateKey)
      elements.input.value = currentTemplateSource()
      state.dynamicPrepared = null
      applyLayoutMode()
    }

    if (element === elements.layoutBalance) {
      setOutputRatio(Number(elements.layoutBalance.value) / 100)
    }

    if ([elements.preset, elements.html, elements.linkify, elements.typographer, elements.breaks, elements.xhtmlOut].includes(element)) {
      state.dynamicPrepared = null
    }

    if (localeSwappedSample) {
      state.dynamicPrepared = null
    }

    elements.copyStatus.textContent = ''
    refresh()
  })
}

elements.resetSample.addEventListener('click', () => {
  elements.input.value = currentTemplateSource()
  elements.preset.value = 'default'
  elements.layoutMode.value = state.layoutMode
  elements.templateSelect.value = state.templateKey
  elements.layoutBalance.value = String(Math.round(state.outputRatio * 100))
  elements.html.checked = false
  elements.linkify.checked = true
  elements.typographer.checked = true
  elements.breaks.checked = false
  elements.xhtmlOut.checked = false
  state.view = 'preview'
  state.dynamicPrepared = null
  elements.copyStatus.textContent = ''
  refresh()
})

elements.tabs.forEach((button) => {
  button.addEventListener('click', () => {
    state.view = button.dataset.view
    updateViewSelection()
  })
})

elements.templateButtons.forEach((button) => {
  button.addEventListener('click', () => {
    state.templateKey = button.dataset.templateButton
    elements.templateSelect.value = state.templateKey
    persistTemplateKey(state.templateKey)
    elements.input.value = currentTemplateSource()
    state.dynamicPrepared = null
    applyLayoutMode()
    refresh()
  })
})

elements.copyHtml.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(elements.htmlView.textContent)
    elements.copyStatus.textContent = currentMessages().copySuccess
  } catch (error) {
    elements.copyStatus.textContent = currentMessages().copyFailure
  }
})

elements.presentToggle.addEventListener('click', async () => {
  await setPresentationMode(!state.presentationMode)
})

elements.presentationToolbarExit.addEventListener('click', async () => {
  await setPresentationMode(false)
})

elements.copyPresentLink.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(presentationHref())
    elements.copyStatus.textContent = currentMessages().copyPresentLinkSuccess
  } catch {
    elements.copyStatus.textContent = currentMessages().copyFailure
  }
})

window.addEventListener('keydown', async (event) => {
  if (event.key === 'Escape' && state.presentationMode) {
    await setPresentationMode(false, { exitFullscreen: true })
  }
})

elements.handle.addEventListener('pointerdown', (event) => {
  if (state.layoutMode !== 'dynamic' || window.innerWidth <= WORKSPACE_BREAKPOINT) {
    return
  }

  state.dragPointerId = event.pointerId
  elements.handle.classList.add('is-dragging')
  if (typeof elements.handle.setPointerCapture === 'function') {
    elements.handle.setPointerCapture(event.pointerId)
  }
  updateRatioFromPointer(event)
  refresh()
})

elements.handle.addEventListener('pointermove', (event) => {
  if (state.dragPointerId !== event.pointerId) {
    return
  }

  updateRatioFromPointer(event)
  if (state.layoutMode === 'dynamic' && state.dynamicPrepared) {
    scheduleDynamicRecompose()
  }
})

elements.handle.addEventListener('pointerup', stopWorkspaceDrag)
elements.handle.addEventListener('pointercancel', stopWorkspaceDrag)
elements.handle.addEventListener('keydown', (event) => {
  if (state.layoutMode !== 'dynamic') {
    return
  }

  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
    return
  }

  const delta = event.key === 'ArrowLeft' ? -0.03 : 0.03
  setOutputRatio(state.outputRatio + delta)
  refresh()
})

window.addEventListener('resize', () => {
  applyLayoutMode()
  if (state.layoutMode !== 'dynamic' || !state.dynamicPrepared) {
    return
  }

  scheduleDynamicRecompose()
})

applyPresentationMode()
refresh()
