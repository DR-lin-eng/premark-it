const FONT_FAMILY_SANS = '"Space Grotesk", "Avenir Next", "Segoe UI", sans-serif'
const FONT_FAMILY_MONO = '"IBM Plex Mono", ui-monospace, monospace'

const STYLE_PRESETS = {
  heading: {
    fontSize: 42,
    lineHeight: 48,
    fontFamily: FONT_FAMILY_SANS,
    fontWeight: 700,
    letterSpacing: -0.35,
    cardPadding: 24
  },
  paragraph: {
    fontSize: 18,
    lineHeight: 30,
    fontFamily: FONT_FAMILY_SANS,
    fontWeight: 400,
    letterSpacing: 0,
    cardPadding: 22
  },
  quote: {
    fontSize: 20,
    lineHeight: 32,
    fontFamily: FONT_FAMILY_SANS,
    fontWeight: 500,
    italic: true,
    letterSpacing: 0,
    cardPadding: 22
  },
  list: {
    fontSize: 18,
    lineHeight: 30,
    fontFamily: FONT_FAMILY_SANS,
    fontWeight: 400,
    letterSpacing: 0,
    cardPadding: 22
  },
  table: {
    fontSize: 15,
    lineHeight: 24,
    fontFamily: FONT_FAMILY_SANS,
    fontWeight: 500,
    letterSpacing: 0,
    cardPadding: 18
  },
  code: {
    fontSize: 15,
    lineHeight: 24,
    fontFamily: FONT_FAMILY_MONO,
    fontWeight: 500,
    letterSpacing: 0,
    cardPadding: 18
  },
  caption: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: FONT_FAMILY_SANS,
    fontWeight: 500,
    letterSpacing: 0,
    cardPadding: 18
  }
}

const htmlEscapeMap = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;'
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"]/g, (char) => htmlEscapeMap[char])
}

function escapeAttribute(value) {
  return escapeHtml(String(value))
}

function createMeasurer() {
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  const cache = new Map()

  function measureText(text, style) {
    const font = styleToFont(style)
    const key = `${font}\u0000${style.letterSpacing || 0}\u0000${text}`
    if (cache.has(key)) {
      return cache.get(key)
    }

    context.font = font
    const width =
      context.measureText(text).width +
      Math.max(0, text.length - 1) * (style.letterSpacing || 0)

    cache.set(key, width)
    return width
  }

  return { measureText }
}

function styleToFont(style) {
  const fontStyle = style.italic ? 'italic ' : ''
  return `${fontStyle}${style.fontWeight} ${style.fontSize}px ${style.fontFamily}`
}

function textToAtoms(text, styleState, blockKind) {
  const atoms = []
  const parts = String(text).split(/(\s+)/)

  for (const part of parts) {
    if (part.length === 0) {
      continue
    }

    if (/^\s+$/.test(part)) {
      if (part.includes('\n')) {
        atoms.push({ type: 'break' })
      } else {
        atoms.push({
          type: 'space',
          text: part,
          html: part,
          styleState,
          blockKind
        })
      }
      continue
    }

    atoms.push({
      type: 'word',
      text: part,
      html: wrapInlineHtml(part, styleState),
      styleState,
      blockKind
    })
  }

  return atoms
}

function wrapInlineHtml(text, styleState) {
  let html = escapeHtml(text)

  if (styleState.code) {
    html = `<code>${html}</code>`
  }

  if (styleState.strong) {
    html = `<strong>${html}</strong>`
  }

  if (styleState.em) {
    html = `<em>${html}</em>`
  }

  if (styleState.linkHref) {
    const title = styleState.linkTitle
      ? ` title="${escapeAttribute(styleState.linkTitle)}"`
      : ''
    html = `<a href="${escapeAttribute(styleState.linkHref)}"${title}>${html}</a>`
  }

  return html
}

function inlineTokensToAtoms(tokens, blockKind) {
  const atoms = []
  const styleState = {
    strong: false,
    em: false,
    code: false,
    linkHref: null,
    linkTitle: null
  }

  for (const token of tokens || []) {
    switch (token.type) {
      case 'text':
        atoms.push(...textToAtoms(token.content, { ...styleState }, blockKind))
        break
      case 'code_inline':
        atoms.push(...textToAtoms(token.content, { ...styleState, code: true }, blockKind))
        break
      case 'softbreak':
      case 'hardbreak':
        atoms.push({ type: 'break' })
        break
      case 'strong_open':
        styleState.strong = true
        break
      case 'strong_close':
        styleState.strong = false
        break
      case 'em_open':
        styleState.em = true
        break
      case 'em_close':
        styleState.em = false
        break
      case 'link_open':
        styleState.linkHref = token.attrGet('href')
        styleState.linkTitle = token.attrGet('title')
        break
      case 'link_close':
        styleState.linkHref = null
        styleState.linkTitle = null
        break
      case 'image':
        atoms.push(...textToAtoms(token.content || token.attrGet('alt') || '', { ...styleState }, blockKind))
        break
      default:
        break
    }
  }

  return atoms
}

function extractPlainText(tokens) {
  return (tokens || [])
    .map((token) => {
      switch (token.type) {
        case 'text':
        case 'code_inline':
          return token.content
        case 'softbreak':
        case 'hardbreak':
          return '\n'
        case 'image':
          return token.content || ''
        default:
          return ''
      }
    })
    .join('')
    .replace(/\n+/g, ' ')
    .trim()
}

function groupTopLevelTokens(tokens) {
  const groups = []

  for (let index = 0; index < tokens.length;) {
    const token = tokens[index]
    const start = index

    if (token.nesting === 1) {
      let level = 1
      index += 1

      while (index < tokens.length && level > 0) {
        if (tokens[index].nesting === 1) level += 1
        if (tokens[index].nesting === -1) level -= 1
        index += 1
      }

      groups.push(tokens.slice(start, index))
      continue
    }

    groups.push([token])
    index += 1
  }

  return groups
}

function buildImageBlock(token) {
  return {
    kind: 'image',
    src: token.attrGet('src') || '',
    alt: token.content || '',
    title: token.attrGet('title') || '',
    ratio: 4 / 3
  }
}

function buildSemanticBlock(group, md, env) {
  const first = group[0]

  switch (first.type) {
    case 'heading_open': {
      const inline = group.find((token) => token.type === 'inline')
      return {
        kind: 'heading',
        depth: Number(first.tag.slice(1)),
        atoms: inlineTokensToAtoms(inline?.children, 'heading')
      }
    }
    case 'paragraph_open': {
      const inline = group.find((token) => token.type === 'inline')
      const children = inline?.children || []
      const visibleChildren = children.filter((token) => token.type !== 'softbreak' && token.type !== 'hardbreak')

      if (visibleChildren.length === 1 && visibleChildren[0].type === 'image') {
        return buildImageBlock(visibleChildren[0])
      }

      return {
        kind: 'paragraph',
        atoms: inlineTokensToAtoms(children, 'paragraph')
      }
    }
    case 'blockquote_open': {
      const inlines = group.filter((token) => token.type === 'inline')
      const atoms = inlines.flatMap((token, index) => {
        const chunk = inlineTokensToAtoms(token.children, 'quote')
        if (index < inlines.length - 1) {
          chunk.push({ type: 'break' })
        }
        return chunk
      })

      return {
        kind: 'quote',
        atoms
      }
    }
    case 'bullet_list_open':
    case 'ordered_list_open': {
      const items = []
      let currentItem = []

      for (const token of group) {
        if (token.type === 'list_item_open') {
          currentItem = []
          continue
        }

        if (token.type === 'inline') {
          currentItem.push(...inlineTokensToAtoms(token.children, 'list'))
        }

        if (token.type === 'list_item_close') {
          items.push(currentItem)
        }
      }

      return {
        kind: 'list',
        ordered: first.type === 'ordered_list_open',
        items
      }
    }
    case 'fence': {
      return {
        kind: 'code',
        lang: first.info || '',
        code: first.content || ''
      }
    }
    case 'table_open': {
      let section = 'head'
      let row = []
      const headers = []
      const rows = []

      for (let index = 0; index < group.length; index += 1) {
        const token = group[index]

        if (token.type === 'tbody_open') {
          section = 'body'
        }

        if (token.type === 'tr_open') {
          row = []
        }

        if (token.type === 'inline') {
          row.push(extractPlainText(token.children))
        }

        if (token.type === 'tr_close') {
          if (section === 'head') headers.push(row)
          else rows.push(row)
        }
      }

      return {
        kind: 'table',
        headers: headers[0] || [],
        rows
      }
    }
    default: {
      return {
        kind: 'html',
        html: md.renderer.render(group, md.options, env)
      }
    }
  }
}

function measureAtoms(atoms, blockKind, measurer) {
  return atoms.map((atom) => {
    if (atom.type === 'break') {
      return atom
    }

    const baseStyle = styleForBlock(blockKind, atom.styleState)
    return {
      ...atom,
      width: atom.type === 'space' ? measurer.measureText(atom.text, baseStyle) : measurer.measureText(atom.text, baseStyle),
      measuredStyle: baseStyle
    }
  })
}

function styleForBlock(blockKind, styleState = {}) {
  const preset = STYLE_PRESETS[blockKind] || STYLE_PRESETS.paragraph
  return {
    ...preset,
    fontWeight: styleState.strong ? 700 : preset.fontWeight,
    italic: Boolean(styleState.em) || Boolean(preset.italic),
    fontFamily: styleState.code ? FONT_FAMILY_MONO : preset.fontFamily
  }
}

function wrapMeasuredAtoms(atoms, availableWidth, measurer) {
  const lines = []
  let currentLine = []
  let currentWidth = 0

  function pushLine() {
    while (currentLine.length > 0 && currentLine[currentLine.length - 1].type === 'space') {
      currentLine.pop()
    }

    lines.push(currentLine)
    currentLine = []
    currentWidth = 0
  }

  for (const atom of atoms) {
    if (atom.type === 'break') {
      pushLine()
      continue
    }

    if (atom.type === 'space' && currentLine.length === 0) {
      continue
    }

    if (atom.type === 'word' && atom.width > availableWidth) {
      const splitAtoms = splitLongAtom(atom, availableWidth, measurer)
      for (const splitAtom of splitAtoms) {
        if (currentWidth + splitAtom.width > availableWidth && currentLine.length > 0) {
          pushLine()
        }
        currentLine.push(splitAtom)
        currentWidth += splitAtom.width
      }
      continue
    }

    if (currentWidth + atom.width > availableWidth && currentLine.length > 0) {
      pushLine()
    }

    if (atom.type === 'space' && currentLine.length === 0) {
      continue
    }

    currentLine.push(atom)
    currentWidth += atom.width
  }

  if (currentLine.length > 0) {
    pushLine()
  }

  return lines.length > 0 ? lines : [[]]
}

function splitLongAtom(atom, availableWidth, measurer) {
  const chars = Array.from(atom.text)
  const pieces = []
  let current = ''
  let width = 0

  for (const char of chars) {
    const charWidth = measurer.measureText(char, atom.measuredStyle)
    if (current.length > 0 && width + charWidth > availableWidth) {
      pieces.push({
        ...atom,
        text: current,
        html: wrapInlineHtml(current, atom.styleState),
        width
      })
      current = char
      width = charWidth
      continue
    }

    current += char
    width += charWidth
  }

  if (current.length > 0) {
    pieces.push({
      ...atom,
      text: current,
      html: wrapInlineHtml(current, atom.styleState),
      width
    })
  }

  return pieces
}

function renderLine(line) {
  if (line.length === 0) {
    return '&nbsp;'
  }

  return line
    .map((atom) => atom.type === 'space' ? atom.text : atom.html)
    .join('')
}

function topLevelBlocksToSemantic(blocks, md, env) {
  return blocks
    .map((group) => buildSemanticBlock(group, md, env))
    .filter(Boolean)
}

async function enrichImageBlock(block) {
  if (!block.src) {
    return block
  }

  try {
    const ratio = await measureImageRatio(block.src)
    block.ratio = ratio
  } catch {
    block.ratio = 4 / 3
  }

  return block
}

const imageRatioCache = new Map()

function measureImageRatio(src) {
  if (imageRatioCache.has(src)) {
    return imageRatioCache.get(src)
  }

  const ratioPromise = new Promise((resolve) => {
    const image = new Image()
    image.onload = () => resolve(image.naturalWidth / image.naturalHeight || 4 / 3)
    image.onerror = () => resolve(4 / 3)
    image.src = src
  })

  imageRatioCache.set(src, ratioPromise)
  return ratioPromise
}

function prepareSemanticBlock(block, measurer) {
  switch (block.kind) {
    case 'heading':
    case 'paragraph':
    case 'quote':
      return {
        ...block,
        measuredAtoms: measureAtoms(block.atoms, block.kind, measurer)
      }
    case 'list':
      return {
        ...block,
        measuredItems: block.items.map((atoms) => measureAtoms(atoms, 'list', measurer))
      }
    default:
      return block
  }
}

export async function prepareDynamicDocument({ prepared, md }) {
  if (document.fonts?.ready) {
    await document.fonts.ready
  }

  const topLevel = groupTopLevelTokens(prepared.tokens)
  const semanticBlocks = topLevelBlocksToSemantic(topLevel, md, prepared.env || {})
  const measurer = createMeasurer()

  const measuredBlocks = []
  for (const block of semanticBlocks) {
    if (block.kind === 'image') {
      measuredBlocks.push(await enrichImageBlock(block))
      continue
    }

    measuredBlocks.push(prepareSemanticBlock(block, measurer))
  }

  return {
    source: prepared.src,
    blocks: measuredBlocks,
    measurer
  }
}

export function computePreviewMetrics(viewportWidth, viewportHeight) {
  const shellPadding = viewportWidth <= 760 ? 16 : 28
  const pageWidth = Math.min(1440, viewportWidth - shellPadding * 2)
  const workspaceColumns = viewportWidth <= 1120 ? 1 : 2
  const workspaceGap = 22
  const panelPadding = viewportWidth <= 760 ? 18 : 22
  const cardPadding = 22

  const outputPanelWidth =
    workspaceColumns === 1
      ? pageWidth
      : (pageWidth - workspaceGap) / 2

  const previewWidth = Math.max(320, outputPanelWidth - panelPadding * 2 - cardPadding * 2)

  return {
    previewWidth,
    viewportWidth,
    viewportHeight,
    wide: workspaceColumns === 2 && previewWidth >= 560
  }
}

function renderMeasuredText(block, width, styleKey, measurer) {
  const style = STYLE_PRESETS[styleKey]
  const contentWidth = Math.max(140, width - style.cardPadding * 2)
  const lines = wrapMeasuredAtoms(block.measuredAtoms, contentWidth, measurer)
  const height = lines.length * style.lineHeight + style.cardPadding * 2

  return {
    height,
    html: `
      <div class="dynamic-card-inner">
        ${lines.map((line) => `<div class="dynamic-line dynamic-line-${styleKey}">${renderLine(line)}</div>`).join('')}
      </div>
    `
  }
}

function renderMeasuredList(block, width, measurer) {
  const style = STYLE_PRESETS.list
  const bulletWidth = measurer.measureText(block.ordered ? '10. ' : '• ', style)
  const contentWidth = Math.max(140, width - style.cardPadding * 2 - bulletWidth)
  const htmlParts = []
  let totalHeight = style.cardPadding * 2

  block.measuredItems.forEach((itemAtoms, index) => {
    const lines = wrapMeasuredAtoms(itemAtoms, contentWidth, measurer)
    totalHeight += lines.length * style.lineHeight
    if (index < block.measuredItems.length - 1) {
      totalHeight += 8
    }

    htmlParts.push(`
      <div class="dynamic-list-item">
        <span class="dynamic-list-marker">${block.ordered ? `${index + 1}.` : '•'}</span>
        <div class="dynamic-list-lines">
          ${lines.map((line) => `<div class="dynamic-line dynamic-line-list">${renderLine(line)}</div>`).join('')}
        </div>
      </div>
    `)
  })

  return {
    height: totalHeight,
    html: `<div class="dynamic-card-inner">${htmlParts.join('')}</div>`
  }
}

function estimateTableHeight(block, width, measurer) {
  const style = STYLE_PRESETS.table
  const columnCount = Math.max(block.headers.length, block.rows[0]?.length || 0, 1)
  const innerWidth = Math.max(160, width - style.cardPadding * 2)
  const cellWidth = innerWidth / columnCount - 12

  const lineCountForCell = (text) => {
    const atoms = measureAtoms(textToAtoms(text, {}, 'table'), 'table', measurer)
    return wrapMeasuredAtoms(atoms, cellWidth, measurer).length
  }

  const headerRows = block.headers.length > 0 ? 1 : 0
  let height = style.cardPadding * 2 + headerRows * (style.lineHeight + 16)

  for (const row of block.rows) {
    const rowLines = Math.max(...row.map((cell) => lineCountForCell(cell)), 1)
    height += rowLines * style.lineHeight + 14
  }

  return Math.max(height, 180)
}

function renderDynamicBlock(block, width, measurer) {
  switch (block.kind) {
    case 'heading':
      return renderMeasuredText(block, width, 'heading', measurer)
    case 'paragraph':
      return renderMeasuredText(block, width, 'paragraph', measurer)
    case 'quote':
      return renderMeasuredText(block, width, 'quote', measurer)
    case 'list':
      return renderMeasuredList(block, width, measurer)
    case 'image': {
      const imageWidth = Math.max(180, width - 24)
      const imageHeight = imageWidth / (block.ratio || 4 / 3)
      const caption = block.alt
        ? `<figcaption>${escapeHtml(block.alt)}</figcaption>`
        : ''
      return {
        height: imageHeight + (block.alt ? 64 : 32),
        html: `
          <figure class="dynamic-figure">
            <img src="${escapeAttribute(block.src)}" alt="${escapeAttribute(block.alt)}">
            ${caption}
          </figure>
        `
      }
    }
    case 'code': {
      const style = STYLE_PRESETS.code
      const lines = String(block.code).replace(/\n$/, '').split('\n')
      const height = style.cardPadding * 2 + Math.max(1, lines.length) * style.lineHeight + (block.lang ? 26 : 0)
      const header = block.lang
        ? `<div class="dynamic-code-header">${escapeHtml(block.lang)}</div>`
        : ''
      return {
        height,
        html: `
          <div class="dynamic-card-inner">
            ${header}
            <pre class="dynamic-code-block"><code>${escapeHtml(block.code)}</code></pre>
          </div>
        `
      }
    }
    case 'table': {
      const height = estimateTableHeight(block, width, measurer)
      const headerHtml = block.headers.length > 0
        ? `<thead><tr>${block.headers.map((cell) => `<th>${escapeHtml(cell)}</th>`).join('')}</tr></thead>`
        : ''
      return {
        height,
        html: `
          <div class="dynamic-card-inner">
            <table class="dynamic-table">
              ${headerHtml}
              <tbody>
                ${block.rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')}
              </tbody>
            </table>
          </div>
        `
      }
    }
    default:
      return {
        height: 180,
        html: `<div class="dynamic-card-inner">${block.html}</div>`
      }
  }
}

function resolveLane(block, compositionState) {
  if (block.kind === 'heading') return 'full'
  if (block.kind === 'code' || block.kind === 'table') return 'full'
  if (compositionState.wide && block.kind === 'quote') return 'side'
  if (compositionState.wide && block.kind === 'image' && !compositionState.usedImageLane) {
    compositionState.usedImageLane = true
    return 'main'
  }

  if (!compositionState.wide) {
    return 'full'
  }

  return compositionState.mainY <= compositionState.sideY ? 'main' : 'side'
}

function cardClassName(block) {
  return `dynamic-card dynamic-card-${block.kind}`
}

export function composeDynamicLayout(preparedDynamicDocument, metrics) {
  const gap = metrics.wide ? 24 : 0
  const mainWidth = metrics.wide
    ? Math.round(metrics.previewWidth * 0.62)
    : metrics.previewWidth
  const sideWidth = metrics.wide
    ? metrics.previewWidth - mainWidth - gap
    : metrics.previewWidth

  const compositionState = {
    wide: metrics.wide,
    mainY: 0,
    sideY: 0,
    usedImageLane: false
  }

  const cards = []

  for (const block of preparedDynamicDocument.blocks) {
    const lane = resolveLane(block, compositionState)
    const width =
      lane === 'full'
        ? metrics.previewWidth
        : lane === 'main'
          ? mainWidth
          : sideWidth
    const rendered = renderDynamicBlock(block, width, preparedDynamicDocument.measurer)

    let x = 0
    let y = 0

    if (lane === 'full') {
      y = Math.max(compositionState.mainY, compositionState.sideY)
      compositionState.mainY = y + rendered.height + 18
      compositionState.sideY = compositionState.mainY
    } else if (lane === 'main') {
      x = 0
      y = compositionState.mainY
      compositionState.mainY += rendered.height + 18
    } else {
      x = mainWidth + gap
      y = compositionState.sideY
      compositionState.sideY += rendered.height + 18
    }

    cards.push({
      x,
      y,
      width,
      height: rendered.height,
      className: cardClassName(block),
      html: rendered.html
    })
  }

  return {
    height: Math.max(compositionState.mainY, compositionState.sideY),
    cards
  }
}
