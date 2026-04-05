const FONT_FAMILY_SANS = '"Space Grotesk", "Avenir Next", "Segoe UI", sans-serif'
const FONT_FAMILY_MONO = '"IBM Plex Mono", ui-monospace, monospace'
const WORKSPACE_HANDLE_WIDTH = 18
const CONTINUATION_DECORATION_HEIGHT = 18
const CARD_HEIGHT_BUFFER = 10

const STYLE_PRESETS = {
  heading: {
    fontSize: 42,
    lineHeight: 48,
    fontFamily: FONT_FAMILY_SANS,
    fontWeight: 700,
    letterSpacing: -0.35,
    cardPadding: 24
  },
  lede: {
    fontSize: 22,
    lineHeight: 34,
    fontFamily: FONT_FAMILY_SANS,
    fontWeight: 500,
    letterSpacing: 0,
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

function normalizeSource(source) {
  return String(source ?? '').replace(/\r\n?/g, '\n')
}

function isBlankLine(line) {
  return /^\s*$/.test(line)
}

function isFenceStart(line) {
  return /^ {0,3}(```+|~~~+)/.test(line)
}

function isBlockquoteLine(line) {
  return /^ {0,3}>/.test(line)
}

function isListLine(line) {
  return /^ {0,3}(?:[*+-]|\d+\.)\s+/.test(line)
}

function isTableCandidate(lines, index) {
  const line = lines[index]
  const next = lines[index + 1]
  return (
    Boolean(line) &&
    Boolean(next) &&
    /\|/.test(line) &&
    /^\s*\|?[:\- ]+\|[:\-| ]*\s*$/.test(next)
  )
}

function isAtxHeading(line) {
  return /^ {0,3}#{1,6}\s+/.test(line)
}

function isThematicBreak(line) {
  return /^ {0,3}(?:[-*_])(?:\s*\1){2,}\s*$/.test(line)
}

function isHtmlBlockStart(line) {
  return /^ {0,3}<(?:!--|[A-Za-z][\w-]*\b|\/[A-Za-z][\w-]*>)/.test(line)
}

function isSetextUnderline(line) {
  return /^ {0,3}(?:=+|-+)\s*$/.test(line)
}

export function splitMarkdownIntoSourceBlocks(source) {
  const normalized = normalizeSource(source)
  const lines = normalized.split('\n')
  const blocks = []

  for (let index = 0; index < lines.length;) {
    if (isBlankLine(lines[index])) {
      index += 1
      continue
    }

    const start = index

    if (isAtxHeading(lines[index]) || isThematicBreak(lines[index])) {
      blocks.push(lines[index])
      index += 1
      continue
    }

    if (isFenceStart(lines[index])) {
      const opener = /^ {0,3}(```+|~~~+)/.exec(lines[index])[1]
      index += 1
      while (index < lines.length && !new RegExp(`^ {0,3}${opener}[ \\t]*$`).test(lines[index])) {
        index += 1
      }
      if (index < lines.length) {
        index += 1
      }
      blocks.push(lines.slice(start, index).join('\n'))
      continue
    }

    if (isBlockquoteLine(lines[index])) {
      index += 1
      while (index < lines.length && (isBlockquoteLine(lines[index]) || isBlankLine(lines[index]))) {
        index += 1
      }
      blocks.push(lines.slice(start, index).join('\n'))
      continue
    }

    if (isListLine(lines[index])) {
      index += 1
      while (index < lines.length) {
        if (isBlankLine(lines[index])) {
          break
        }

        if (
          isListLine(lines[index]) ||
          /^ {2,}/.test(lines[index]) ||
          /^ {0,3}>/.test(lines[index])
        ) {
          index += 1
          continue
        }

        break
      }
      blocks.push(lines.slice(start, index).join('\n'))
      continue
    }

    if (isTableCandidate(lines, index)) {
      index += 2
      while (index < lines.length && !isBlankLine(lines[index])) {
        index += 1
      }
      blocks.push(lines.slice(start, index).join('\n'))
      continue
    }

    if (isHtmlBlockStart(lines[index])) {
      index += 1
      while (index < lines.length && !isBlankLine(lines[index])) {
        index += 1
      }
      blocks.push(lines.slice(start, index).join('\n'))
      continue
    }

    index += 1
    while (
      index < lines.length &&
      !isBlankLine(lines[index]) &&
      !isFenceStart(lines[index]) &&
      !isAtxHeading(lines[index]) &&
      !isThematicBreak(lines[index]) &&
      !isHtmlBlockStart(lines[index])
    ) {
      if (index + 1 < lines.length && isSetextUnderline(lines[index + 1])) {
        index += 2
        break
      }
      index += 1
    }
    blocks.push(lines.slice(start, index).join('\n'))
  }

  return blocks.filter((block) => block.trim().length > 0)
}

export function diffSourceBlocks(previousBlocks, nextBlocks) {
  let prefix = 0
  const prefixLimit = Math.min(previousBlocks.length, nextBlocks.length)

  while (prefix < prefixLimit && previousBlocks[prefix] === nextBlocks[prefix]) {
    prefix += 1
  }

  let suffix = 0
  const suffixLimit = Math.min(previousBlocks.length - prefix, nextBlocks.length - prefix)

  while (
    suffix < suffixLimit &&
    previousBlocks[previousBlocks.length - 1 - suffix] === nextBlocks[nextBlocks.length - 1 - suffix]
  ) {
    suffix += 1
  }

  return {
    prefix,
    suffix,
    changedPrevious: Math.max(0, previousBlocks.length - prefix - suffix),
    changedNext: Math.max(0, nextBlocks.length - prefix - suffix)
  }
}

function createMeasurer(sharedCache = new Map()) {
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  const cache = sharedCache

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

function groupLineSpan(group) {
  let start = null
  let end = null

  for (const token of group) {
    if (!token.map) {
      continue
    }

    if (start === null || token.map[0] < start) {
      start = token.map[0]
    }

    if (end === null || token.map[1] > end) {
      end = token.map[1]
    }
  }

  return start === null || end === null ? null : [start, end]
}

function groupSourceKey(group, lines) {
  const span = groupLineSpan(group)
  const tokenTypes = group.map((token) => token.type).join('|')

  if (!span) {
    return `${tokenTypes}::${group.map((token) => token.content || '').join('\u0001')}`
  }

  return `${tokenTypes}::${lines.slice(span[0], span[1]).join('\n')}`
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

function blockSignature(block) {
  switch (block.kind) {
    case 'heading':
    case 'lede':
    case 'paragraph':
    case 'quote':
      return JSON.stringify({
        kind: block.kind,
        atoms: block.atoms.map((atom) => ({
          type: atom.type,
          text: atom.text ?? '',
          html: atom.html ?? '',
          styleState: atom.styleState ?? null
        }))
      })
    case 'list':
      return JSON.stringify({
        kind: block.kind,
        ordered: block.ordered,
        items: block.items.map((item) => item.map((atom) => ({
          type: atom.type,
          text: atom.text ?? '',
          html: atom.html ?? '',
          styleState: atom.styleState ?? null
        })))
      })
    case 'image':
      return JSON.stringify({
        kind: block.kind,
        src: block.src,
        alt: block.alt,
        title: block.title
      })
    case 'code':
      return JSON.stringify({
        kind: block.kind,
        lang: block.lang,
        code: block.code
      })
    case 'table':
      return JSON.stringify({
        kind: block.kind,
        headers: block.headers,
        rows: block.rows
      })
    default:
      return JSON.stringify({
        kind: block.kind,
        html: block.html ?? ''
      })
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
    case 'lede':
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

function decorateLayoutHints(blocks) {
  let firstQuoteAssigned = false
  let firstImageAssigned = false

  return blocks.map((block) => {
    if (block.kind === 'heading') {
      return { ...block, placementHint: 'full' }
    }

    if (block.kind === 'lede') {
      return { ...block, placementHint: 'full' }
    }

    if (block.kind === 'quote' && !firstQuoteAssigned) {
      firstQuoteAssigned = true
      return { ...block, placementHint: 'side', variant: 'note' }
    }

    if (block.kind === 'image' && !firstImageAssigned) {
      firstImageAssigned = true
      return { ...block, placementHint: 'side', variant: 'hero' }
    }

    if (block.kind === 'code' || block.kind === 'table') {
      return { ...block, placementHint: 'full' }
    }

    return block
  })
}

export async function prepareDynamicDocument({ prepared, md, cache }) {
  return prepareDynamicDocumentFromSource({
    source: prepared?.src,
    md,
    cache
  })
}

export async function prepareDynamicDocumentFromSource({ source, md, cache }) {
  if (document.fonts?.ready) {
    await document.fonts.ready
  }

  const sourceBlocks = splitMarkdownIntoSourceBlocks(source)
  const previousSourceBlocks = cache?.documentState?.sourceBlocks || []
  const previousResolvedBlocks = cache?.documentState?.resolvedSourceBlocks || []
  const diff = diffSourceBlocks(previousSourceBlocks, sourceBlocks)
  const semanticBlocks = []
  const resolvedSourceBlocks = new Array(sourceBlocks.length)
  let reusedPositionalBlocks = 0
  let reusedContentBlocks = 0
  let preparedNewSourceBlocks = 0

  for (let index = 0; index < diff.prefix; index += 1) {
    const reused = previousResolvedBlocks[index] || []
    resolvedSourceBlocks[index] = reused
    semanticBlocks.push(...reused)
    reusedPositionalBlocks += 1
  }

  for (let offset = 0; offset < diff.suffix; offset += 1) {
    const nextIndex = sourceBlocks.length - diff.suffix + offset
    const previousIndex = previousSourceBlocks.length - diff.suffix + offset
    const reused = previousResolvedBlocks[previousIndex] || []
    resolvedSourceBlocks[nextIndex] = reused
  }

  for (let index = diff.prefix; index < sourceBlocks.length - diff.suffix; index += 1) {
    const sourceBlock = sourceBlocks[index]

    if (cache?.sourceBlockCache?.has(sourceBlock)) {
      const reused = cache.sourceBlockCache.get(sourceBlock)
      resolvedSourceBlocks[index] = reused
      semanticBlocks.push(...reused)
      reusedContentBlocks += 1
      continue
    }

    const preparedBlock = md.prepare(sourceBlock, {})
    const topLevel = groupTopLevelTokens(preparedBlock.tokens)
    const lines = preparedBlock.src.split('\n')
    const builtBlocks = []

    for (const group of topLevel) {
      const sourceKey = groupSourceKey(group, lines)

      if (cache?.semanticCache?.has(sourceKey)) {
        builtBlocks.push(cache.semanticCache.get(sourceKey))
        continue
      }

      const semanticBlock = buildSemanticBlock(group, md, preparedBlock.env || {})
      cache?.semanticCache?.set(sourceKey, semanticBlock)
      builtBlocks.push(semanticBlock)
    }

    cache?.sourceBlockCache?.set(sourceBlock, builtBlocks)
    resolvedSourceBlocks[index] = builtBlocks
    semanticBlocks.push(...builtBlocks)
    preparedNewSourceBlocks += 1
  }

  for (let offset = 0; offset < diff.suffix; offset += 1) {
    const nextIndex = sourceBlocks.length - diff.suffix + offset
    semanticBlocks.push(...(resolvedSourceBlocks[nextIndex] || []))
  }

  cache.documentState = {
    sourceBlocks,
    resolvedSourceBlocks
  }
  const measurer = createMeasurer(cache?.textCache)

  const adjustedBlocks = semanticBlocks.map((block, index) => {
      if (
        block.kind === 'paragraph' &&
        index === 1 &&
        semanticBlocks[0]?.kind === 'heading'
      ) {
        return {
          ...block,
          kind: 'lede'
        }
      }

      return block
    })

  const measuredBlocks = []
  let reusedMeasuredBlocks = 0

  for (const block of adjustedBlocks) {
    const signature = blockSignature(block)

    if (cache?.blockCache?.has(signature)) {
      measuredBlocks.push(cache.blockCache.get(signature))
      reusedMeasuredBlocks += 1
      continue
    }

    let measuredBlock
    if (block.kind === 'image') {
      measuredBlock = await enrichImageBlock(block)
    } else {
      measuredBlock = prepareSemanticBlock(block, measurer)
    }

    measuredBlock.cacheKey = signature

    cache?.blockCache?.set(signature, measuredBlock)
    measuredBlocks.push(measuredBlock)
  }

  return {
    source: normalizeSource(source),
    blocks: decorateLayoutHints(measuredBlocks),
    measurer
    ,
    cacheStats: {
      reusedPositionalBlocks,
      reusedContentBlocks,
      preparedNewSourceBlocks,
      reusedMeasuredBlocks,
      totalBlocks: measuredBlocks.length,
      changedSourceBlocks: diff.changedNext
    }
  }
}

export function computePreviewMetrics(viewportWidth, viewportHeight, outputRatio = 0.5) {
  const shellPadding = viewportWidth <= 760 ? 16 : 28
  const pageWidth = Math.min(1440, viewportWidth - shellPadding * 2)
  const workspaceColumns = viewportWidth <= 1120 ? 1 : 2
  const panelPadding = viewportWidth <= 760 ? 18 : 22
  const cardPadding = 22
  const workspaceChrome = workspaceColumns === 1 ? 0 : WORKSPACE_HANDLE_WIDTH

  const outputPanelWidth =
    workspaceColumns === 1
      ? pageWidth
      : (pageWidth - workspaceChrome) * outputRatio

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
  return renderMeasuredTextLines(lines, styleKey, false)
}

function renderMeasuredTextLines(lines, styleKey, continuation = false) {
  const style = STYLE_PRESETS[styleKey]
  const height =
    lines.length * style.lineHeight +
    style.cardPadding * 2 +
    (continuation ? CONTINUATION_DECORATION_HEIGHT : 0) +
    CARD_HEIGHT_BUFFER
  return {
    height,
    html: `
      <div class="dynamic-card-inner${continuation ? ' dynamic-card-inner-continuation' : ''}">
        ${lines.map((line) => `<div class="dynamic-line dynamic-line-${styleKey}">${renderLine(line)}</div>`).join('')}
      </div>
    `
  }
}

function renderMeasuredList(block, width, measurer) {
  const style = STYLE_PRESETS.list
  const bulletWidth = measurer.measureText(block.ordered ? '10. ' : '• ', style)
  const contentWidth = Math.max(140, width - style.cardPadding * 2 - bulletWidth)
  return renderMeasuredListItems(block.measuredItems, block.ordered, width, measurer, 0, false)
}

function renderMeasuredListItems(items, ordered, width, measurer, startIndex = 0, continuation = false) {
  const style = STYLE_PRESETS.list
  const bulletWidth = measurer.measureText(ordered ? '10. ' : '• ', style)
  const contentWidth = Math.max(140, width - style.cardPadding * 2 - bulletWidth)
  const htmlParts = []
  let totalHeight =
    style.cardPadding * 2 +
    (continuation ? CONTINUATION_DECORATION_HEIGHT : 0) +
    CARD_HEIGHT_BUFFER

  items.forEach((itemAtoms, index) => {
    const lines = wrapMeasuredAtoms(itemAtoms, contentWidth, measurer)
    totalHeight += lines.length * style.lineHeight
    if (index < items.length - 1) {
      totalHeight += 8
    }

    htmlParts.push(`
      <div class="dynamic-list-item">
        <span class="dynamic-list-marker">${ordered ? `${startIndex + index + 1}.` : '•'}</span>
        <div class="dynamic-list-lines">
          ${lines.map((line) => `<div class="dynamic-line dynamic-line-list">${renderLine(line)}</div>`).join('')}
        </div>
      </div>
    `)
  })

  return {
    height: totalHeight,
    html: `<div class="dynamic-card-inner${continuation ? ' dynamic-card-inner-continuation' : ''}">${htmlParts.join('')}</div>`
  }
}

function countWrappedCodeLines(code, availableWidth, measurer) {
  const style = styleForBlock('code', {})
  const rawLines = String(code).replace(/\n$/, '').split('\n')

  return rawLines.reduce((total, rawLine) => {
    if (rawLine.length === 0) {
      return total + 1
    }

    const atom = {
      type: 'word',
      text: rawLine,
      html: escapeHtml(rawLine),
      styleState: {},
      measuredStyle: style,
      width: measurer.measureText(rawLine, style)
    }

    if (atom.width <= availableWidth) {
      return total + 1
    }

    return total + splitLongAtom(atom, availableWidth, measurer).length
  }, 0)
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
    case 'lede':
      return renderMeasuredText(block, width, 'lede', measurer)
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
        height: imageHeight + (block.alt ? 64 : 32) + CARD_HEIGHT_BUFFER,
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
      const codeContentWidth = Math.max(120, width - style.cardPadding * 2 - 36)
      const visualLineCount = Math.max(1, countWrappedCodeLines(block.code, codeContentWidth, measurer))
      const height =
        style.cardPadding * 2 +
        36 +
        visualLineCount * style.lineHeight +
        (block.lang ? 38 : 0)
      const header = block.lang
        ? `<div class="dynamic-code-header">${escapeHtml(block.lang)}</div>`
        : ''
      return {
        height: height + CARD_HEIGHT_BUFFER,
        html: `
          <div class="dynamic-card-inner">
            ${header}
            <pre class="dynamic-code-block"><code>${escapeHtml(block.code)}</code></pre>
          </div>
        `
      }
    }
    case 'table': {
      const { height, columnWidths } = measureTableLayout(block, width, measurer)
      const headerHtml = block.headers.length > 0
        ? `<thead><tr>${block.headers.map((cell) => `<th>${escapeHtml(cell)}</th>`).join('')}</tr></thead>`
        : ''
      const colgroup = `<colgroup>${columnWidths.map((columnWidth) => `<col style="width:${columnWidth}px">`).join('')}</colgroup>`
      return {
        height,
        html: `
          <div class="dynamic-card-inner">
            <table class="dynamic-table">
              ${colgroup}
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

function splitTextBlock(block, width, styleKey, measurer, maxLinesPerFragment) {
  const style = STYLE_PRESETS[styleKey]
  const contentWidth = Math.max(140, width - style.cardPadding * 2)
  const lines = wrapMeasuredAtoms(block.measuredAtoms, contentWidth, measurer)

  if (lines.length <= maxLinesPerFragment) {
    return [renderMeasuredTextLines(lines, styleKey, false)]
  }

  const fragments = []
  for (let index = 0; index < lines.length; index += maxLinesPerFragment) {
    fragments.push(
      renderMeasuredTextLines(
        lines.slice(index, index + maxLinesPerFragment),
        styleKey,
        index > 0
      )
    )
  }

  return fragments
}

function splitListBlock(block, width, measurer, maxItemsPerFragment) {
  if (block.measuredItems.length <= maxItemsPerFragment) {
    return [renderMeasuredList(block, width, measurer)]
  }

  const fragments = []
  for (let index = 0; index < block.measuredItems.length; index += maxItemsPerFragment) {
    fragments.push(
      renderMeasuredListItems(
        block.measuredItems.slice(index, index + maxItemsPerFragment),
        block.ordered,
        width,
        measurer,
        index,
        index > 0
      )
    )
  }

  return fragments
}

function createRenderedFragments(block, width, measurer, metrics) {
  if (metrics.wide && block.kind === 'paragraph') {
    return splitTextBlock(block, width, 'paragraph', measurer, 6)
  }

  if (metrics.wide && block.kind === 'list' && block.measuredItems.length > 5) {
    return splitListBlock(block, width, measurer, 4)
  }

  return [renderDynamicBlock(block, width, measurer)]
}

function resolveLane(block, compositionState) {
  if (block.placementHint === 'full') return 'full'

  if (compositionState.wide && block.placementHint === 'side') {
    return 'side'
  }

  if (!compositionState.wide) {
    return 'full'
  }

  return compositionState.mainY <= compositionState.sideY ? 'main' : 'side'
}

function cardClassName(block) {
  return [
    'dynamic-card',
    `dynamic-card-${block.kind}`,
    block.variant ? `dynamic-card-${block.variant}` : ''
  ]
    .filter(Boolean)
    .join(' ')
}

function measureTableLayout(block, width, measurer) {
  const style = STYLE_PRESETS.table
  const columnCount = Math.max(block.headers.length, block.rows[0]?.length || 0, 1)
  const innerWidth = Math.max(160, width - style.cardPadding * 2)
  const rawColumnWidths = new Array(columnCount).fill(88)

  const measuredWidthForCell = (text) => {
    const atoms = measureAtoms(textToAtoms(text, {}, 'table'), 'table', measurer)
    return atoms.reduce((sum, atom) => sum + (atom.width || 0), 0) + 26
  }

  for (let index = 0; index < columnCount; index += 1) {
    rawColumnWidths[index] = Math.max(rawColumnWidths[index], measuredWidthForCell(block.headers[index] || ''))
    for (const row of block.rows) {
      rawColumnWidths[index] = Math.max(rawColumnWidths[index], measuredWidthForCell(row[index] || ''))
    }
  }

  let columnWidths = rawColumnWidths.slice()
  const totalRaw = rawColumnWidths.reduce((sum, value) => sum + value, 0)

  if (totalRaw > innerWidth) {
    const minWidth = 96
    const scaled = columnWidths.map((value) => Math.max(minWidth, value * innerWidth / totalRaw))
    const scaledTotal = scaled.reduce((sum, value) => sum + value, 0)
    columnWidths = scaled.map((value) => value * innerWidth / scaledTotal)
  } else {
    const extra = innerWidth - totalRaw
    const distribution = extra / columnCount
    columnWidths = columnWidths.map((value) => value + distribution)
  }

  const lineCountForCell = (text, columnWidth) => {
    const atoms = measureAtoms(textToAtoms(text, {}, 'table'), 'table', measurer)
    return wrapMeasuredAtoms(atoms, Math.max(72, columnWidth - 26), measurer).length
  }

  let height = style.cardPadding * 2 + (block.headers.length > 0 ? style.lineHeight + 16 : 0)
  for (const row of block.rows) {
    const rowLines = Math.max(
      ...row.map((cell, index) => lineCountForCell(cell, columnWidths[index] || columnWidths[0])),
      1
    )
    height += rowLines * style.lineHeight + 14
  }

  return {
    height: Math.max(height + CARD_HEIGHT_BUFFER, 180),
    columnWidths
  }
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
    const initialLane = resolveLane(block, compositionState)
    const initialWidth =
      initialLane === 'full'
        ? metrics.previewWidth
        : initialLane === 'main'
          ? mainWidth
          : sideWidth

    const renderedFragments = createRenderedFragments(
      block,
      initialWidth,
      preparedDynamicDocument.measurer,
      metrics
    )

    renderedFragments.forEach((rendered, index) => {
      const lane =
        index === 0 || initialLane === 'full' || !metrics.wide
          ? initialLane
          : (compositionState.mainY <= compositionState.sideY ? 'main' : 'side')
      const width =
        lane === 'full'
          ? metrics.previewWidth
          : lane === 'main'
            ? mainWidth
            : sideWidth

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
        key: `${block.cacheKey || cardClassName(block)}:${index}`,
        x,
        y,
        width,
        height: rendered.height,
        className: `${cardClassName(block)}${index > 0 ? ' dynamic-card-continuation' : ''}`,
        html: rendered.html
      })
    })
  }

  return {
    height: Math.max(compositionState.mainY, compositionState.sideY),
    cards
  }
}
