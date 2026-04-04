import markdownit from '../index.mjs'

const DEFAULT_SOURCE = `# Markdown-It Compatible Rewrite

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

\`\`\`js
import markdownit from "markdown-it-pretext-compatible";

const md = markdownit({ linkify: true, typographer: true });
const prepared = md.prepare("*Hello* from GitHub Pages");
console.log(md.render(prepared));
\`\`\`

Inline HTML stays escaped by default: <span>safe</span>.
`

const state = {
  view: 'preview',
  source: DEFAULT_SOURCE
}

const elements = {
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
  panels: Array.from(document.querySelectorAll('[data-view-panel]'))
}

elements.input.value = state.source

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
  const cards = [
    {
      label: 'Lines',
      value: String(elements.input.value.split('\n').length)
    },
    {
      label: 'Block tokens',
      value: String(prepared.tokens.length)
    },
    {
      label: 'Inline tokens',
      value: String(countInlineChildren(prepared.tokens))
    },
    {
      label: 'Timing',
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
  const empty = '<div class="empty-state"><p>Start typing Markdown to see the output.</p></div>'
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
  elements.preset,
  elements.html,
  elements.linkify,
  elements.typographer,
  elements.breaks,
  elements.xhtmlOut
]) {
  element.addEventListener('change', refresh)
}

elements.resetSample.addEventListener('click', () => {
  elements.input.value = DEFAULT_SOURCE
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
    elements.copyStatus.textContent = 'HTML copied.'
  } catch (error) {
    elements.copyStatus.textContent = 'Clipboard unavailable in this browser.'
  }
})

refresh()
