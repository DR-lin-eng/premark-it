import markdownit from '../index.mjs'

const LOCALES = ['en', 'zh-CN']
const STORAGE_KEY = 'premark-it-demo-locale'
const metaDescription = document.querySelector('meta[name="description"]')

const MESSAGES = {
  en: {
    htmlLang: 'en',
    documentTitle: 'Premark-It Demo',
    metaDescription: 'A GitHub Pages demo for the fully compatible markdown-it rewrite with a Pretext-inspired prepare() cache.',
    eyebrow: 'GitHub Pages Demo',
    heroTitle: 'markdown-it compatibility, live in the browser.',
    heroText: 'This playground runs the local rewrite in-browser, shows rendered HTML, and demonstrates the extra <code>prepare()</code> cache layer.',
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
    options: {
      html: 'Allow HTML',
      linkify: 'Linkify',
      typographer: 'Typographer',
      breaks: 'Hard breaks',
      xhtmlOut: 'XHTML output'
    },
    textareaAriaLabel: 'Markdown input',
    outputKicker: 'Output',
    outputTitle: 'Live Result',
    outputViewAriaLabel: 'Output views',
    tabs: {
      preview: 'Preview',
      html: 'HTML',
      tokens: 'Tokens'
    },
    copyHtml: 'Copy HTML',
    copySuccess: 'HTML copied.',
    copyFailure: 'Clipboard unavailable in this browser.',
    emptyState: 'Start typing Markdown to see the output.',
    stats: {
      lines: 'Lines',
      blockTokens: 'Block tokens',
      inlineTokens: 'Inline tokens',
      timing: 'Timing'
    },
    sampleSource: `# Premark-It Demo

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
`
  },
  'zh-CN': {
    htmlLang: 'zh-CN',
    documentTitle: 'Premark-It 演示',
    metaDescription: '一个运行在 GitHub Pages 上的演示页，用于展示这版完全兼容 markdown-it 的重写实现和额外的 prepare() 缓存层。',
    eyebrow: 'GitHub Pages 演示',
    heroTitle: '在浏览器里直接体验 markdown-it 兼容实现。',
    heroText: '这个演示会在浏览器中运行本地重写实现，展示渲染后的 HTML，并演示额外的 <code>prepare()</code> 缓存层。',
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
    options: {
      html: '允许 HTML',
      linkify: '自动链接',
      typographer: '排版增强',
      breaks: '强制换行',
      xhtmlOut: 'XHTML 输出'
    },
    textareaAriaLabel: 'Markdown 输入',
    outputKicker: '输出',
    outputTitle: '实时结果',
    outputViewAriaLabel: '输出视图',
    tabs: {
      preview: '预览',
      html: 'HTML',
      tokens: '令牌'
    },
    copyHtml: '复制 HTML',
    copySuccess: 'HTML 已复制。',
    copyFailure: '当前浏览器无法访问剪贴板。',
    emptyState: '开始输入 Markdown，就能看到实时渲染结果。',
    stats: {
      lines: '行数',
      blockTokens: '块级令牌',
      inlineTokens: '行内令牌',
      timing: '耗时'
    },
    sampleSource: `# Premark-It 演示

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
`
  }
}

const state = {
  view: 'preview',
  locale: detectLocale()
}

const elements = {
  locale: document.querySelector('#locale-select'),
  preset: document.querySelector('#preset'),
  html: document.querySelector('#html'),
  linkify: document.querySelector('#linkify'),
  typographer: document.querySelector('#typographer'),
  breaks: document.querySelector('#breaks'),
  xhtmlOut: document.querySelector('#xhtmlOut'),
  input: document.querySelector('#markdown-input'),
  preview: document.querySelector('#preview-view'),
  htmlView: document.querySelector('#html-view'),
  tokensView: document.querySelector('#tokens-view'),
  stats: document.querySelector('#stats-strip'),
  copyHtml: document.querySelector('#copy-html'),
  copyStatus: document.querySelector('#copy-status'),
  resetSample: document.querySelector('#reset-sample'),
  tabs: Array.from(document.querySelectorAll('.tab-button')),
  panels: Array.from(document.querySelectorAll('[data-view-panel]')),
  tablist: document.querySelector('.tablist')
}

elements.locale.value = state.locale

applyLocale()
elements.input.value = currentMessages().sampleSource

function translate(path) {
  return path.split('.').reduce((value, part) => value?.[part], currentMessages())
}

function currentMessages() {
  return MESSAGES[state.locale]
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
  elements.locale.setAttribute('aria-label', messages.localeAriaLabel)
  elements.input.setAttribute('aria-label', messages.textareaAriaLabel)
  elements.tablist.setAttribute('aria-label', messages.outputViewAriaLabel)
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
      label: labels.timing,
      value: `${prepareDuration.toFixed(2)}ms + ${renderDuration.toFixed(2)}ms`
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
  elements.tabs.forEach((button) => {
    const active = button.dataset.view === state.view
    button.classList.toggle('is-active', active)
    button.setAttribute('aria-selected', active ? 'true' : 'false')
  })

  elements.panels.forEach((panel) => {
    const active = panel.dataset.viewPanel === state.view
    panel.classList.toggle('is-hidden', !active)
  })
}

function renderEmptyPreview() {
  const empty = `<div class="empty-state"><p>${currentMessages().emptyState}</p></div>`
  elements.preview.innerHTML = empty
  elements.htmlView.textContent = ''
  elements.tokensView.textContent = ''
  elements.stats.innerHTML = ''
}

function refresh() {
  const source = elements.input.value

  if (!source.trim()) {
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

  renderStats(prepared, prepareDuration, renderDuration)
  elements.preview.innerHTML = html
  elements.htmlView.textContent = html
  elements.tokensView.textContent = JSON.stringify(
    prepared.tokens.map(simplifyToken),
    null,
    2
  )
  updateViewSelection()
}

elements.input.addEventListener('input', refresh)

for (const element of [
  elements.locale,
  elements.preset,
  elements.html,
  elements.linkify,
  elements.typographer,
  elements.breaks,
  elements.xhtmlOut
]) {
  element.addEventListener('change', () => {
    if (element === elements.locale) {
      const previousLocale = state.locale
      const shouldSwapSample =
        elements.input.value.trim().length === 0 ||
        elements.input.value === MESSAGES[previousLocale].sampleSource

      state.locale = elements.locale.value
      persistLocale(state.locale)
      applyLocale()

      if (shouldSwapSample) {
        elements.input.value = currentMessages().sampleSource
      }

      elements.copyStatus.textContent = ''
    }

    refresh()
  })
}

elements.resetSample.addEventListener('click', () => {
  elements.input.value = currentMessages().sampleSource
  elements.preset.value = 'default'
  elements.html.checked = false
  elements.linkify.checked = true
  elements.typographer.checked = true
  elements.breaks.checked = false
  elements.xhtmlOut.checked = false
  state.view = 'preview'
  elements.copyStatus.textContent = ''
  refresh()
})

elements.tabs.forEach((button) => {
  button.addEventListener('click', () => {
    state.view = button.dataset.view
    updateViewSelection()
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

refresh()
