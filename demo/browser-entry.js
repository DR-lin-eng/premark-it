import markdownit from '../index.mjs'
import {
  composeDynamicLayout,
  computePreviewMetrics,
  prepareDynamicDocumentFromSource
} from './dynamic-layout.js'
import { BROWSER_STYLES } from './browser-styles.js'
import {
  layout,
  layoutWithLines,
  profilePrepare,
  prepareRichText,
  prepareText
} from '../prelayout/index.mjs'

const DEFAULT_OPTIONS = {
  preset: 'default',
  locale: 'en',
  capability: 'editorial',
  html: false,
  linkify: true,
  typographer: true,
  breaks: false,
  xhtmlOut: false,
  outputRatio: 0.62,
  useDynamic: true,
  useShadow: true
}

const CAPABILITY_PRESETS = {
  editorial: {
    outputRatio: 0.62
  },
  story: {
    outputRatio: 0.58
  },
  docs: {
    outputRatio: 0.68
  },
  compact: {
    outputRatio: 0.54
  }
}

const TEXT_STYLE_BODY = {
  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif',
  fontSize: 17,
  lineHeight: 27,
  fontWeight: 400
}

const TEXT_STYLE_NOTE = {
  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif',
  fontSize: 15,
  lineHeight: 24,
  fontWeight: 500
}

const TEXT_STYLE_MONO = {
  fontFamily: '"SF Mono", SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  fontSize: 13,
  lineHeight: 20,
  fontWeight: 500,
  whiteSpace: 'pre-wrap',
  tabSize: 2
}

const CUSTOM_ELEMENT_ATTRIBUTES = [
  'markdown',
  'capability',
  'locale',
  'preset',
  'html',
  'linkify',
  'typographer',
  'breaks',
  'xhtml-out',
  'output-ratio',
  'dynamic'
]

function md(strings, ...values) {
  return strings.reduce((result, chunk, index) => {
    return result + chunk + (values[index] ?? '')
  }, '')
}

function resolveTarget(target) {
  if (typeof target === 'string') {
    const resolved = document.querySelector(target)
    if (!resolved) {
      throw new Error(`Target not found for selector: ${target}`)
    }
    return resolved
  }

  if (target?.nodeType === 1) {
    return target
  }

  throw new Error('render() expects a selector or Element target')
}

function injectStyles(root) {
  if (root.querySelector?.('style[data-premark-editorial-styles]')) {
    return
  }

  const style = document.createElement('style')
  style.dataset.premarkEditorialStyles = 'true'
  style.textContent = BROWSER_STYLES
  root.appendChild(style)
}

function mergeOptions(options = {}) {
  const capability = options.capability || DEFAULT_OPTIONS.capability
  return {
    ...DEFAULT_OPTIONS,
    ...(CAPABILITY_PRESETS[capability] || {}),
    ...options,
    capability
  }
}

function parseBooleanAttribute(value, fallback = false) {
  if (value == null) return fallback
  if (value === '' || value === 'true' || value === '1' || value === 'yes') return true
  if (value === 'false' || value === '0' || value === 'no') return false
  return fallback
}

function readElementOptions(element) {
  return {
    capability: element.getAttribute('capability') || undefined,
    locale: element.getAttribute('locale') || undefined,
    preset: element.getAttribute('preset') || undefined,
    html: parseBooleanAttribute(element.getAttribute('html'), undefined),
    linkify: parseBooleanAttribute(element.getAttribute('linkify'), undefined),
    typographer: parseBooleanAttribute(element.getAttribute('typographer'), undefined),
    breaks: parseBooleanAttribute(element.getAttribute('breaks'), undefined),
    xhtmlOut: parseBooleanAttribute(element.getAttribute('xhtml-out'), undefined),
    outputRatio: element.hasAttribute('output-ratio')
      ? Number(element.getAttribute('output-ratio'))
      : undefined,
    useDynamic: element.hasAttribute('dynamic')
      ? parseBooleanAttribute(element.getAttribute('dynamic'), true)
      : undefined
  }
}

function createParser(options) {
  const preset = options.preset
  const parser = preset === 'default' ? markdownit() : markdownit(preset)

  parser.set({
    html: options.html,
    linkify: options.linkify,
    typographer: options.typographer,
    breaks: options.breaks,
    xhtmlOut: options.xhtmlOut
  })

  return parser
}

function plainTextFromMarkdown(parser, markdownSource) {
  const wrapper = document.createElement('div')
  wrapper.innerHTML = parser.render(markdownSource)
  return wrapper.textContent || ''
}

function readMarkdownSource(source) {
  if (!source) return ''

  const scriptLike = source.querySelector?.('script[type="text/markdown"], template[data-markdown]')
  if (scriptLike) {
    return scriptLike.textContent || ''
  }

  return source.getAttribute?.('markdown') || source.textContent || ''
}

function paragraphBlocks(markdownSource) {
  return String(markdownSource)
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
}

function splitAccordionSections(markdownSource) {
  const normalized = String(markdownSource).replace(/\r\n?/g, '\n')
  const parts = normalized.split(/^##\s+/m)
  if (parts.length === 1) {
    return [{
      title: 'Section',
      markdown: normalized.trim()
    }]
  }

  const firstIntro = parts.shift()?.trim()
  const sections = []
  if (firstIntro) {
    sections.push({
      title: 'Overview',
      markdown: firstIntro
    })
  }

  parts.forEach((part) => {
    const [titleLine, ...rest] = part.split('\n')
    sections.push({
      title: titleLine.trim(),
      markdown: rest.join('\n').trim()
    })
  })

  return sections.filter((section) => section.markdown)
}

function splitChatMessages(markdownSource) {
  const lines = String(markdownSource).replace(/\r\n?/g, '\n').split('\n')
  const messages = []
  let current = null

  for (const line of lines) {
    const match = /^(User|Assistant|System):\s*(.*)$/.exec(line)
    if (match) {
      if (current) messages.push(current)
      current = {
        role: match[1].toLowerCase(),
        markdown: match[2] || ''
      }
      continue
    }

    if (!current) {
      current = { role: 'assistant', markdown: line }
      continue
    }

    current.markdown += `${current.markdown ? '\n' : ''}${line}`
  }

  if (current) messages.push(current)
  return messages.filter((message) => message.markdown.trim())
}

function splitMasonryCards(markdownSource) {
  const sections = String(markdownSource).split(/\n{2,}---\n{2,}/)
  return sections
    .map((section) => section.trim())
    .filter(Boolean)
    .map((section, index) => {
      const [titleLine, ...rest] = section.split('\n')
      const title = titleLine.replace(/^#+\s*/, '').trim() || `Card ${index + 1}`
      return {
        title,
        markdown: rest.join('\n').trim() || section
      }
    })
}

function renderLineHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function renderPlainPrepared(prepared, width, className = 'premark-line') {
  const result = layoutWithLines(prepared, width)
  return {
    height: result.height,
    html: `
      <div class="premark-lines" style="height:${Math.ceil(result.height)}px">
        ${result.lines.map((line) => `
          <div class="${className}" style="transform: translateY(${Math.round(line.y)}px)">
            ${line.spans.map((span) => `<span>${renderLineHtml(span.text)}</span>`).join('')}
          </div>
        `).join('')}
      </div>
    `
  }
}

function fitBubbleWidth(prepared, maxWidth) {
  const base = layout(prepared, maxWidth)
  let low = 160
  let high = maxWidth
  let best = maxWidth

  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    const next = layout(prepared, mid)
    if (next.lineCount <= base.lineCount) {
      best = mid
      high = mid - 1
    } else {
      low = mid + 1
    }
  }

  return best
}

function renderBubblesCapability(stage, parser, markdownSource, options) {
  const texts = paragraphBlocks(markdownSource).map((block) => plainTextFromMarkdown(parser, block))
  stage.innerHTML = `
    <div class="premark-demo-label">Bubbles</div>
    <div class="premark-bubbles">
      ${texts.map((text, index) => {
        const prepared = prepareText(text, TEXT_STYLE_BODY, { locale: options.locale })
        const bubbleWidth = fitBubbleWidth(prepared, 320)
        const rendered = renderPlainPrepared(prepared, bubbleWidth, 'premark-line premark-bubble-line')
        return `
          <div class="premark-bubble-row ${index % 2 === 0 ? 'is-left' : 'is-right'}">
            <div class="premark-bubble" style="width:${bubbleWidth}px">
              ${rendered.html}
            </div>
          </div>
        `
      }).join('')}
    </div>
  `
}

function renderMarkdownChatCapability(stage, parser, markdownSource, options) {
  const messages = splitChatMessages(markdownSource)
  stage.innerHTML = `
    <div class="premark-demo-label">Markdown Chat</div>
    <div class="premark-chat">
      ${messages.map((message) => {
        const html = parser.render(message.markdown)
        const roleClass = `role-${message.role}`
        return `
          <div class="premark-chat-row ${roleClass}">
            <div class="premark-chat-bubble ${roleClass}">
              ${html}
            </div>
          </div>
        `
      }).join('')}
    </div>
  `
}

function renderMasonryCapability(stage, parser, markdownSource, options) {
  const cards = splitMasonryCards(markdownSource)
  const width = Math.max(900, stage.clientWidth || 960)
  const columnCount = width >= 1040 ? 3 : 2
  const gap = 18
  const columnWidth = Math.floor((width - gap * (columnCount - 1)) / columnCount)
  const heights = new Array(columnCount).fill(0)
  const items = []

  cards.forEach((card, index) => {
    const text = plainTextFromMarkdown(parser, card.markdown)
    const prepared = prepareText(text, TEXT_STYLE_BODY, { locale: options.locale })
    const measured = layout(prepared, columnWidth - 32)
    const cardHeight = Math.max(180, measured.height + 104)
    const column = heights.indexOf(Math.min(...heights))
    const x = column * (columnWidth + gap)
    const y = heights[column]
    heights[column] += cardHeight + gap
    items.push({ ...card, x, y, height: cardHeight, width: columnWidth, index })
  })

  stage.innerHTML = `
    <div class="premark-demo-label">Masonry</div>
    <div class="premark-masonry-stage" style="height:${Math.max(...heights)}px">
      ${items.map((item) => `
        <article class="premark-masonry-card" style="left:${item.x}px; top:${item.y}px; width:${item.width}px; height:${item.height}px">
          <span class="premark-masonry-index">${item.index + 1}</span>
          <h3>${item.title}</h3>
          <div class="premark-masonry-body">${parser.render(item.markdown)}</div>
        </article>
      `).join('')}
    </div>
  `
}

function renderAccordionCapability(stage, parser, markdownSource, options) {
  const sections = splitAccordionSections(markdownSource)
  stage.innerHTML = `
    <div class="premark-demo-label">Accordion</div>
    <div class="premark-accordion">
      ${sections.map((section, index) => {
        const text = plainTextFromMarkdown(parser, section.markdown)
        const prepared = prepareText(text, TEXT_STYLE_BODY, { locale: options.locale })
        const measured = layout(prepared, 720)
        const panelHeight = Math.max(measured.height + 24, 80)
        return `
          <section class="premark-accordion-section ${index === 0 ? 'is-open' : ''}">
            <button class="premark-accordion-trigger" type="button">${section.title}</button>
            <div class="premark-accordion-panel" style="--panel-height:${panelHeight}px">
              <div class="premark-accordion-content">
                ${parser.render(section.markdown)}
              </div>
            </div>
          </section>
        `
      }).join('')}
    </div>
  `

  stage.querySelectorAll('.premark-accordion-trigger').forEach((button) => {
    button.addEventListener('click', () => {
      const section = button.closest('.premark-accordion-section')
      section?.classList.toggle('is-open')
    })
  })
}

function parseRichSegments(markdownSource) {
  const segments = []
  const chipRegex = /\[\[([^\]]+)\]\]/g
  let lastIndex = 0
  let match

  while ((match = chipRegex.exec(markdownSource))) {
    if (match.index > lastIndex) {
      segments.push({ kind: 'text', text: markdownSource.slice(lastIndex, match.index) })
    }
    segments.push({ kind: 'chip', text: match[1] })
    lastIndex = chipRegex.lastIndex
  }

  if (lastIndex < markdownSource.length) {
    segments.push({ kind: 'text', text: markdownSource.slice(lastIndex) })
  }

  return segments
}

function parseInlineFlow(markdownSource) {
  const segments = []
  const chipRegex = /\[\[([^\]]+)\]\]/g
  let lastIndex = 0
  let match

  while ((match = chipRegex.exec(markdownSource))) {
    if (match.index > lastIndex) {
      segments.push({ kind: 'text', text: markdownSource.slice(lastIndex, match.index) })
    }
    segments.push({ kind: 'chip', text: match[1] })
    lastIndex = chipRegex.lastIndex
  }

  if (lastIndex < markdownSource.length) {
    segments.push({ kind: 'text', text: markdownSource.slice(lastIndex) })
  }

  return segments
}

function renderInlineFlowCapability(stage, _parser, markdownSource, options) {
  const pieces = parseInlineFlow(markdownSource)
  const segments = []
  pieces.forEach((piece) => {
    if (piece.kind === 'chip') {
      segments.push({
        text: ` ${piece.text} `,
        strong: true
      })
      return
    }
    segments.push({ text: piece.text })
  })

  const prepared = prepareRichText(segments, TEXT_STYLE_BODY, { locale: options.locale })
  const rendered = renderPlainPrepared(prepared, Math.min(820, stage.clientWidth || 820), 'premark-line premark-inline-flow-line')

  stage.innerHTML = `
    <div class="premark-demo-label">Inline Flow</div>
    <div class="premark-inline-flow-shell">
      ${pieces.map((piece) => {
        if (piece.kind === 'chip') {
          return `<span class="premark-chip">${piece.text}</span>`
        }
        return `<span class="premark-inline-fragment">${piece.text}</span>`
      }).join('')}
    </div>
    <div class="premark-inline-flow-measured">
      ${rendered.html}
    </div>
  `
}

function renderLineBreakCapability(stage, parser, markdownSource, options) {
  const text = plainTextFromMarkdown(parser, markdownSource)
  const prepared = prepareText(text, TEXT_STYLE_BODY, { locale: options.locale })
  const widths = [240, 320, 420]
  const rows = widths.map((width) => {
    const measured = layoutWithLines(prepared, width)
    return `
      <section class="premark-line-break-card">
        <h3>${width}px</h3>
        <div class="premark-line-break-preview">
          ${renderPlainPrepared(prepared, width, 'premark-line premark-line-break-line').html}
        </div>
        <p class="premark-line-break-meta">${measured.lineCount} lines</p>
      </section>
    `
  }).join('')

  stage.innerHTML = `
    <div class="premark-demo-label">Line Break</div>
    <div class="premark-line-break-grid">${rows}</div>
  `
}

function renderPrepareProfileCapability(stage, parser, markdownSource, options) {
  const text = plainTextFromMarkdown(parser, markdownSource)
  const prepared = prepareText(text, TEXT_STYLE_BODY, { locale: options.locale })
  const profile = profilePrepare(prepared)
  const runKinds = prepared.units.reduce((acc, unit) => {
    acc[unit.analysisKind || unit.kind] = (acc[unit.analysisKind || unit.kind] || 0) + 1
    return acc
  }, {})

  stage.innerHTML = `
    <div class="premark-demo-label">Prepare Profile</div>
    <div class="premark-profile-grid">
      <div class="premark-profile-card">
        <h3>Engine</h3>
        <p>${profile.engineProfile}</p>
      </div>
      <div class="premark-profile-card">
        <h3>Units</h3>
        <p>${profile.unitCount}</p>
      </div>
      <div class="premark-profile-card">
        <h3>Chunks</h3>
        <p>${profile.chunkCount}</p>
      </div>
      <div class="premark-profile-card">
        <h3>Correction</h3>
        <p>${profile.correctionApplied ? 'Applied' : 'None'}</p>
      </div>
    </div>
    <div class="premark-profile-detail">
      ${Object.entries(runKinds).map(([kind, count]) => `<span class="premark-chip">${kind}: ${count}</span>`).join('')}
    </div>
  `
}

function renderRichTextCapability(stage, parser, markdownSource, options) {
  const parts = parseRichSegments(markdownSource)
  const html = parts.map((part) => {
    if (part.kind === 'chip') {
      return `<span class="premark-chip">${part.text}</span>`
    }
    return parser.renderInline(part.text)
  }).join('')

  stage.innerHTML = `
    <div class="premark-demo-label">Rich Text</div>
    <div class="premark-rich-card">
      <div class="premark-rich-copy">${html}</div>
    </div>
  `
}

function renderJustificationCapability(stage, parser, markdownSource, options) {
  const text = plainTextFromMarkdown(parser, markdownSource)
  const prepared = prepareText(text, TEXT_STYLE_BODY, { locale: options.locale })
  const measured = renderPlainPrepared(prepared, 280, 'premark-line premark-compare-line')

  stage.innerHTML = `
    <div class="premark-demo-label">Justification Comparison</div>
    <div class="premark-compare-grid">
      <section class="premark-compare-card">
        <h3>CSS</h3>
        <p class="premark-css-justify">${text}</p>
      </section>
      <section class="premark-compare-card">
        <h3>Greedy</h3>
        ${measured.html}
      </section>
      <section class="premark-compare-card">
        <h3>Tight</h3>
        <div class="premark-tight-copy">${parser.render(markdownSource)}</div>
      </section>
    </div>
  `
}

function renderAsciiCapability(stage, _parser, markdownSource, options) {
  const text = String(markdownSource).trim() || 'PREMARK'
  const proportional = text.split('').map((char) => `<span class="premark-ascii-proportional-char">${char}</span>`).join('')
  const mono = text.split('').map((char) => `<span class="premark-ascii-mono-char">${char}</span>`).join('')

  stage.innerHTML = `
    <div class="premark-demo-label">Variable Typographic ASCII</div>
    <div class="premark-ascii-grid">
      <section class="premark-ascii-card">
        <h3>Proportional</h3>
        <div class="premark-ascii-board proportional">${proportional}</div>
      </section>
      <section class="premark-ascii-card">
        <h3>Monospace</h3>
        <div class="premark-ascii-board mono">${mono}</div>
      </section>
    </div>
  `
}

function renderCapabilityPreview(stage, parser, markdownSource, options) {
  switch (options.capability) {
    case 'accordion':
      renderAccordionCapability(stage, parser, markdownSource, options)
      return false
    case 'bubbles':
      renderBubblesCapability(stage, parser, markdownSource, options)
      return false
    case 'markdown-chat':
      renderMarkdownChatCapability(stage, parser, markdownSource, options)
      return false
    case 'rich-text':
      renderRichTextCapability(stage, parser, markdownSource, options)
      return false
    case 'inline-flow':
      renderInlineFlowCapability(stage, parser, markdownSource, options)
      return false
    case 'masonry':
      renderMasonryCapability(stage, parser, markdownSource, options)
      return false
    case 'justification':
      renderJustificationCapability(stage, parser, markdownSource, options)
      return false
    case 'ascii':
      renderAsciiCapability(stage, parser, markdownSource, options)
      return false
    case 'line-break':
      renderLineBreakCapability(stage, parser, markdownSource, options)
      return false
    case 'prepare-profile':
      renderPrepareProfileCapability(stage, parser, markdownSource, options)
      return false
    case 'dynamic-layout':
      return true
    case 'editorial-engine':
      return true
    default:
      return true
  }
}

function wrapPreviewNode(node, className) {
  if (!node?.parentNode) return null
  const wrapper = document.createElement('div')
  wrapper.className = className
  node.parentNode.insertBefore(wrapper, node)
  wrapper.appendChild(node)
  return wrapper
}

function enhanceClassicPreview(container) {
  const article = container.querySelector('.rendered-article')
  if (!article) return
  const children = Array.from(article.children)

  children.forEach((node, index) => {
    const tag = node.tagName?.toLowerCase?.()
    const previous = children[index - 1] || null

    if (tag === 'h1' && index > 0) {
      node.classList.add('rendered-section-title')
    }

    if (tag === 'p' && previous?.tagName === 'H1') {
      node.classList.add('rendered-lede')
    }

    if (tag === 'blockquote') {
      node.classList.add('rendered-note')
    }

    if (tag === 'ul' || tag === 'ol') {
      node.classList.add('rendered-list')
    }

    if (tag === 'pre') {
      wrapPreviewNode(node, 'rendered-code-shell')
    }

    if (tag === 'table') {
      wrapPreviewNode(node, 'rendered-table-shell')
    }

    if (tag === 'p' && node.childElementCount === 1 && node.firstElementChild?.tagName === 'IMG') {
      node.classList.add('rendered-figure-block')
    }
  })
}

function renderClassicPreview(stage, html, pending = false) {
  stage.innerHTML = `
    <div class="premark-status">${pending ? 'Preparing editorial layout…' : 'Classic preview'}</div>
    <div class="rendered-article">${html}</div>
  `
  stage.classList.toggle('premark-rendered-stage', true)
  enhanceClassicPreview(stage)
}

function renderDynamicPreview(stage, layout, pending = false) {
  stage.innerHTML = `
    ${pending ? '<div class="premark-status">Preparing editorial layout…</div>' : ''}
    <div class="dynamic-stage" style="height:${Math.ceil(layout.height)}px">
      ${layout.items.map((item) => `
        <section
          class="${item.className}"
          data-item-key="${item.key}"
          style="left:${Math.round(item.x)}px;top:${Math.round(item.y)}px;width:${Math.round(item.width)}px;height:${Math.round(item.height)}px"
        >
          ${item.html}
        </section>
      `).join('')}
    </div>
  `
}

function computeEmbedMetrics(containerWidth, containerHeight, outputRatio) {
  const viewportWidth = Math.max(360, Math.round(containerWidth) + 44)
  const viewportHeight = Math.max(420, Math.round(containerHeight || 960))
  return computePreviewMetrics(viewportWidth, viewportHeight, outputRatio)
}

function createRenderRoot(target, options) {
  if (target.shadowRoot) {
    return target.shadowRoot
  }

  if (options.useShadow !== false && typeof target.attachShadow === 'function') {
    return target.attachShadow({ mode: 'open' })
  }

  return target
}

function readElementMarkdown(element) {
  return readMarkdownSource(element)
}

function createController(target, initialMarkdown, initialOptions = {}) {
  const host = resolveTarget(target)
  const options = mergeOptions(initialOptions)
  const root = createRenderRoot(host, options)
  injectStyles(root)

  const container = document.createElement('div')
  container.className = 'premark-editorial-root'
  root.appendChild(container)

  const stage = document.createElement('div')
  stage.className = 'premark-rendered-stage'
  container.appendChild(stage)

  const cache = {
    textCache: new Map(),
    sourceBlockCache: new Map(),
    semanticCache: new Map(),
    preparedBlockCache: new Map(),
    spreadCache: new Map(),
    documentState: {
      sourceBlocks: [],
      resolvedSourceBlocks: []
    }
  }

  const state = {
    markdown: String(initialMarkdown ?? ''),
    options,
    dynamicPrepared: null,
    dynamicKey: '',
    renderToken: 0,
    resizeObserver: null,
    resizeFrame: 0
  }

  function syncCapability() {
    container.dataset.capability = state.options.capability
  }

  function dynamicCacheKey(markdownSource) {
    return JSON.stringify({
      markdownSource,
      locale: state.options.locale,
      preset: state.options.preset,
      html: state.options.html,
      linkify: state.options.linkify,
      typographer: state.options.typographer,
      breaks: state.options.breaks,
      xhtmlOut: state.options.xhtmlOut,
      capability: state.options.capability
    })
  }

  function renderCurrentDynamicLayout() {
    if (!state.dynamicPrepared) return
    const width = host.clientWidth || 960
    const height = host.clientHeight || 720
    const metrics = computeEmbedMetrics(width, height, state.options.outputRatio)
    renderDynamicPreview(stage, composeDynamicLayout(state.dynamicPrepared, metrics))
  }

  async function ensureDynamicPrepared(markdownSource, parser, renderToken) {
    const nextKey = dynamicCacheKey(markdownSource)
    if (state.dynamicPrepared && state.dynamicKey === nextKey) {
      return state.dynamicPrepared
    }

    const preparedDynamic = await prepareDynamicDocumentFromSource({
      source: markdownSource,
      md: parser,
      cache,
      locale: state.options.locale
    })

    if (renderToken !== state.renderToken) {
      return null
    }

    state.dynamicPrepared = preparedDynamic
    state.dynamicKey = nextKey
    return preparedDynamic
  }

  async function render() {
    syncCapability()
    const renderToken = ++state.renderToken
    const parser = createParser(state.options)
    const env = {}
    const prepared = parser.prepare(state.markdown, env)
    const html = parser.render(prepared)

    const shouldUseEditorial = renderCapabilityPreview(stage, parser, state.markdown, state.options)
    if (!shouldUseEditorial) {
      return
    }

    if (!state.options.useDynamic) {
      renderClassicPreview(stage, html)
      return
    }

    renderClassicPreview(stage, html, true)
    const preparedDynamic = await ensureDynamicPrepared(state.markdown, parser, renderToken)
    if (!preparedDynamic || renderToken !== state.renderToken) {
      return
    }

    const width = host.clientWidth || 960
    const height = host.clientHeight || 720
    const metrics = computeEmbedMetrics(width, height, state.options.outputRatio)
    renderDynamicPreview(stage, composeDynamicLayout(preparedDynamic, metrics))
  }

  function setMarkdown(nextMarkdown) {
    state.markdown = String(nextMarkdown ?? '')
    return render()
  }

  function setOptions(nextOptions) {
    state.options = mergeOptions({
      ...state.options,
      ...nextOptions
    })
    return render()
  }

  function destroy() {
    state.resizeObserver?.disconnect()
    state.renderToken += 1
    container.remove()
  }

  state.resizeObserver = new ResizeObserver(() => {
    if (state.resizeFrame) {
      cancelAnimationFrame(state.resizeFrame)
    }

    state.resizeFrame = requestAnimationFrame(() => {
      state.resizeFrame = 0
      const editorialCapability = ['editorial', 'story', 'docs', 'compact', 'editorial-engine', 'dynamic-layout']
        .includes(state.options.capability)
      if (editorialCapability && state.options.useDynamic && state.dynamicPrepared) {
        renderCurrentDynamicLayout()
        return
      }
      render()
    })
  })
  state.resizeObserver.observe(host)

  render()

  return {
    render,
    setMarkdown,
    setOptions,
    destroy,
    get markdown() {
      return state.markdown
    },
    get options() {
      return { ...state.options }
    }
  }
}

function render(target, markdownSource, options) {
  return createController(target, markdownSource, options)
}

function upgradeElement(element) {
  if (element.__premarkController) {
    return element.__premarkController
  }

  const markdownSource = readElementMarkdown(element)
  element.innerHTML = ''
  const controller = createController(element, markdownSource, {
    ...readElementOptions(element),
    useShadow: true
  })
  element.__premarkController = controller
  return controller
}

function upgradeAll(root = document) {
  const elements = root.querySelectorAll?.('premark-editorial, [data-premark-editorial]') || []
  return Array.from(elements).map(upgradeElement)
}

class PremarkEditorialElement extends HTMLElement {
  static get observedAttributes() {
    return CUSTOM_ELEMENT_ATTRIBUTES
  }

  connectedCallback() {
    if (!this.__premarkController) {
      upgradeElement(this)
    }
  }

  disconnectedCallback() {
    this.__premarkController?.destroy?.()
    this.__premarkController = null
  }

  attributeChangedCallback() {
    if (!this.isConnected || !this.__premarkController) return
    this.__premarkController.setOptions(readElementOptions(this))
    if (this.hasAttribute('markdown')) {
      this.__premarkController.setMarkdown(this.getAttribute('markdown'))
    }
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('premark-editorial')) {
  customElements.define('premark-editorial', PremarkEditorialElement)
}

const api = {
  md,
  render,
  create: createController,
  upgradeAll,
  editorial(target, markdownSource, options = {}) {
    return render(target, markdownSource, { ...options, capability: 'editorial-engine' })
  },
  dynamicLayout(target, markdownSource, options = {}) {
    return render(target, markdownSource, { ...options, capability: 'dynamic-layout' })
  },
  chat(target, markdownSource, options = {}) {
    return render(target, markdownSource, { ...options, capability: 'markdown-chat', useDynamic: false })
  },
  richText(target, markdownSource, options = {}) {
    return render(target, markdownSource, { ...options, capability: 'rich-text', useDynamic: false })
  },
  inlineFlow(target, markdownSource, options = {}) {
    return render(target, markdownSource, { ...options, capability: 'inline-flow', useDynamic: false })
  },
  bubbles(target, markdownSource, options = {}) {
    return render(target, markdownSource, { ...options, capability: 'bubbles', useDynamic: false })
  },
  masonry(target, markdownSource, options = {}) {
    return render(target, markdownSource, { ...options, capability: 'masonry', useDynamic: false })
  },
  accordion(target, markdownSource, options = {}) {
    return render(target, markdownSource, { ...options, capability: 'accordion', useDynamic: false })
  },
  justification(target, markdownSource, options = {}) {
    return render(target, markdownSource, { ...options, capability: 'justification', useDynamic: false })
  },
  ascii(target, markdownSource, options = {}) {
    return render(target, markdownSource, { ...options, capability: 'ascii', useDynamic: false })
  },
  lineBreak(target, markdownSource, options = {}) {
    return render(target, markdownSource, { ...options, capability: 'line-break', useDynamic: false })
  },
  prepareProfile(target, markdownSource, options = {}) {
    return render(target, markdownSource, { ...options, capability: 'prepare-profile', useDynamic: false })
  }
}

if (typeof window !== 'undefined') {
  window.PremarkItEditorial = api
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      upgradeAll()
    }, { once: true })
  } else {
    upgradeAll()
  }
}

export default api
export {
  md,
  render,
  createController as create,
  upgradeAll
}
