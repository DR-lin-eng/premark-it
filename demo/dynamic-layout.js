import {
  prepareRichText,
  prepareText,
  layout,
  layoutNextLine,
  materializeLineRange,
  profilePrepare
} from '../prelayout/index.mjs'

const FONT_FAMILY_UI = '"Space Grotesk", "Avenir Next", "Segoe UI", sans-serif'
const FONT_FAMILY_DISPLAY = '"Fraunces", Georgia, serif'
const FONT_FAMILY_BODY = '"Source Serif 4", Georgia, serif'
const FONT_FAMILY_MONO = '"IBM Plex Mono", ui-monospace, monospace'
const WORKSPACE_HANDLE_WIDTH = 18

const TEXT_STYLES = {
  heading: {
    fontFamily: FONT_FAMILY_DISPLAY,
    fontSize: 54,
    lineHeight: 62,
    fontWeight: 600,
    letterSpacing: -0.52
  },
  lede: {
    fontFamily: FONT_FAMILY_BODY,
    fontSize: 28,
    lineHeight: 42,
    fontWeight: 500,
    letterSpacing: 0
  },
  paragraph: {
    fontFamily: FONT_FAMILY_BODY,
    fontSize: 20,
    lineHeight: 34,
    fontWeight: 400,
    letterSpacing: 0
  },
  list: {
    fontFamily: FONT_FAMILY_BODY,
    fontSize: 19,
    lineHeight: 32,
    fontWeight: 400,
    letterSpacing: 0
  },
  quote: {
    fontFamily: FONT_FAMILY_BODY,
    fontSize: 18,
    lineHeight: 30,
    fontWeight: 500,
    italic: true,
    letterSpacing: 0
  },
  code: {
    fontFamily: FONT_FAMILY_MONO,
    fontSize: 14,
    lineHeight: 22,
    fontWeight: 500,
    whiteSpace: 'pre-wrap',
    tabSize: 2
  },
  table: {
    fontFamily: FONT_FAMILY_BODY,
    fontSize: 15,
    lineHeight: 24,
    fontWeight: 500,
    letterSpacing: 0
  },
  caption: {
    fontFamily: FONT_FAMILY_UI,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: 500,
    letterSpacing: 0.12
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
      if (index < lines.length) index += 1
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
        if (isBlankLine(lines[index])) break
        if (isListLine(lines[index]) || /^ {2,}/.test(lines[index]) || /^ {0,3}>/.test(lines[index])) {
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

function sameSegmentFormatting(left, right) {
  return (
    Boolean(left?.strong) === Boolean(right?.strong) &&
    Boolean(left?.em) === Boolean(right?.em) &&
    Boolean(left?.code) === Boolean(right?.code) &&
    (left?.href || null) === (right?.href || null) &&
    (left?.title || null) === (right?.title || null)
  )
}

function pushRichSegment(segments, next) {
  if (!next) return
  if (next.kind === 'hardbreak' || next.kind === 'softbreak') {
    segments.push(next)
    return
  }

  if (!next.text) return
  const previous = segments[segments.length - 1]
  if (previous?.text && sameSegmentFormatting(previous, next)) {
    previous.text += next.text
    return
  }

  segments.push(next)
}

function inlineTokensToRichSegments(tokens) {
  const segments = []
  const styleState = {
    strong: false,
    em: false,
    code: false,
    href: null,
    title: null
  }

  for (const token of tokens || []) {
    switch (token.type) {
      case 'text':
        pushRichSegment(segments, {
          text: token.content,
          strong: styleState.strong,
          em: styleState.em,
          code: styleState.code,
          href: styleState.href,
          title: styleState.title
        })
        break
      case 'code_inline':
        pushRichSegment(segments, {
          text: token.content,
          strong: styleState.strong,
          em: styleState.em,
          code: true,
          href: styleState.href,
          title: styleState.title
        })
        break
      case 'softbreak':
        segments.push({ kind: 'softbreak' })
        break
      case 'hardbreak':
        segments.push({ kind: 'hardbreak' })
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
        styleState.href = token.attrGet('href')
        styleState.title = token.attrGet('title')
        break
      case 'link_close':
        styleState.href = null
        styleState.title = null
        break
      case 'image':
        pushRichSegment(segments, {
          text: token.content || token.attrGet('alt') || '',
          strong: styleState.strong,
          em: styleState.em,
          code: styleState.code,
          href: styleState.href,
          title: styleState.title
        })
        break
      default:
        break
    }
  }

  return segments
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
          return ' '
        case 'image':
          return token.content || token.attrGet?.('alt') || ''
        default:
          return ''
      }
    })
    .join('')
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
    if (!token.map) continue
    if (start === null || token.map[0] < start) start = token.map[0]
    if (end === null || token.map[1] > end) end = token.map[1]
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
    alt: token.content || token.attrGet('alt') || '',
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
        segments: inlineTokensToRichSegments(inline?.children)
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
        segments: inlineTokensToRichSegments(children)
      }
    }
    case 'blockquote_open': {
      const inlines = group.filter((token) => token.type === 'inline')
      const segments = []
      inlines.forEach((token, index) => {
        segments.push(...inlineTokensToRichSegments(token.children))
        if (index < inlines.length - 1) segments.push({ kind: 'hardbreak' })
      })
      return {
        kind: 'quote',
        segments
      }
    }
    case 'bullet_list_open':
    case 'ordered_list_open': {
      const ordered = first.type === 'ordered_list_open'
      const items = []
      let currentItem = []

      for (const token of group) {
        if (token.type === 'list_item_open') {
          currentItem = []
          continue
        }

        if (token.type === 'inline') {
          currentItem.push(...inlineTokensToRichSegments(token.children))
        }

        if (token.type === 'list_item_close') {
          items.push(currentItem)
        }
      }

      return {
        kind: 'list',
        ordered,
        items
      }
    }
    case 'fence':
      return {
        kind: 'code',
        lang: first.info || '',
        code: first.content || ''
      }
    case 'table_open': {
      let section = 'head'
      let row = []
      const headers = []
      const rows = []

      for (let index = 0; index < group.length; index += 1) {
        const token = group[index]
        if (token.type === 'tbody_open') section = 'body'
        if (token.type === 'tr_open') row = []
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
    default:
      return {
        kind: 'html',
        html: md.renderer.render(group, md.options, env)
      }
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
        segments: block.segments
      })
    case 'list':
      return JSON.stringify({
        kind: block.kind,
        ordered: block.ordered,
        items: block.items
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
        html: block.html || ''
      })
  }
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

async function enrichImageBlock(block) {
  if (!block.src) return block
  try {
    return {
      ...block,
      ratio: await measureImageRatio(block.src)
    }
  } catch {
    return {
      ...block,
      ratio: 4 / 3
    }
  }
}

function listSegments(items, ordered) {
  const segments = []
  items.forEach((itemSegments, index) => {
    pushRichSegment(segments, {
      text: ordered ? `${index + 1}. ` : '• '
    })
    itemSegments.forEach((segment) => pushRichSegment(segments, segment))
    if (index < items.length - 1) {
      segments.push({ kind: 'hardbreak' })
    }
  })
  return segments
}

async function prepareSemanticBlock(block, locale) {
  switch (block.kind) {
    case 'heading':
    case 'lede':
    case 'paragraph':
    case 'quote': {
      const prepared = prepareRichText(block.segments, TEXT_STYLES[block.kind], { locale })
      return {
        ...block,
        prepared,
        prepareProfile: profilePrepare(prepared)
      }
    }
    case 'list': {
      const prepared = prepareRichText(listSegments(block.items, block.ordered), TEXT_STYLES.list, { locale })
      return {
        ...block,
        prepared,
        prepareProfile: profilePrepare(prepared)
      }
    }
    case 'code': {
      const prepared = prepareText(block.code.replace(/\n$/, ''), TEXT_STYLES.code, { locale })
      return {
        ...block,
        prepared,
        prepareProfile: profilePrepare(prepared)
      }
    }
    case 'image':
      return enrichImageBlock(block)
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
      return { ...block, placementHint: 'rail', variant: 'note' }
    }

    if (block.kind === 'image' && !firstImageAssigned) {
      firstImageAssigned = true
      return { ...block, placementHint: 'rail', variant: 'figure' }
    }

    if (block.kind === 'code' || block.kind === 'table' || block.kind === 'html') {
      return { ...block, placementHint: 'full' }
    }

    return { ...block, placementHint: 'main' }
  })
}

export async function prepareDynamicDocument({ prepared, md, cache, locale = 'en' }) {
  return prepareDynamicDocumentFromSource({
    source: prepared?.src,
    md,
    cache,
    locale
  })
}

export async function prepareDynamicDocumentFromSource({ source, md, cache, locale = 'en' }) {
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

  const adjustedBlocks = semanticBlocks.map((block, index) => {
    if (block.kind === 'paragraph' && index === 1 && semanticBlocks[0]?.kind === 'heading') {
      return {
        ...block,
        kind: 'lede'
      }
    }
    return block
  })

  const preparedBlocks = []
  let reusedPreparedBlocks = 0

  for (const block of adjustedBlocks) {
    const signature = blockSignature(block)

    if (cache?.preparedBlockCache?.has(signature)) {
      preparedBlocks.push(cache.preparedBlockCache.get(signature))
      reusedPreparedBlocks += 1
      continue
    }

    const preparedBlock = await prepareSemanticBlock(block, locale)
    preparedBlock.cacheKey = signature
    cache?.preparedBlockCache?.set(signature, preparedBlock)
    preparedBlocks.push(preparedBlock)
  }

  const decoratedBlocks = decorateLayoutHints(preparedBlocks)
  const prepareProfiles = decoratedBlocks
    .map((block) => block.prepareProfile)
    .filter(Boolean)

  const correctionApplied = prepareProfiles.some((entry) => entry.correctionApplied)
  const domCalibrationUsed = prepareProfiles.some((entry) => entry.domCalibrationUsed)
  const engineProfile = prepareProfiles[0]?.engineProfile || 'n/a'

  return {
    source: normalizeSource(source),
    locale,
    blocks: decoratedBlocks,
    spreadCache: cache?.spreadCache || null,
    measurementProfile: {
      engineProfile,
      correctionApplied,
      domCalibrationUsed
    },
    cacheStats: {
      reusedPositionalBlocks,
      reusedContentBlocks,
      preparedNewSourceBlocks,
      reusedPreparedBlocks,
      totalBlocks: decoratedBlocks.length,
      changedSourceBlocks: diff.changedNext
    }
  }
}

export function computePreviewMetrics(viewportWidth, viewportHeight, outputRatio = 0.5) {
  const shellPadding = viewportWidth <= 760 ? 16 : 28
  const pageWidth = Math.min(1520, viewportWidth - shellPadding * 2)
  const workspaceColumns = viewportWidth <= 1120 ? 1 : 2
  const panelPadding = viewportWidth <= 760 ? 18 : 22
  const stageInset = viewportWidth <= 760 ? 12 : 18
  const workspaceChrome = workspaceColumns === 1 ? 0 : WORKSPACE_HANDLE_WIDTH

  const outputPanelWidth =
    workspaceColumns === 1
      ? pageWidth
      : (pageWidth - workspaceChrome) * outputRatio

  const previewWidth = Math.max(320, outputPanelWidth - panelPadding * 2 - stageInset * 2)
  const wide = workspaceColumns === 2 && previewWidth >= 600
  const gutter = wide ? 42 : 0
  const mainWidth = wide
    ? Math.max(420, Math.round(previewWidth * 0.62) - Math.round(gutter / 2))
    : previewWidth
  const sideWidth = wide ? previewWidth - mainWidth - gutter : previewWidth

  return {
    previewWidth,
    viewportWidth,
    viewportHeight,
    wide,
    gutter,
    mainWidth,
    sideWidth,
    sideX: wide ? mainWidth + gutter : 0
  }
}

function renderRichSpan(span) {
  let content = escapeHtml(span.text)

  if (span.segment?.code) {
    content = `<code>${content}</code>`
  }

  if (span.segment?.strong) {
    content = `<strong>${content}</strong>`
  }

  if (span.segment?.em) {
    content = `<em>${content}</em>`
  }

  if (span.segment?.href) {
    const title = span.segment.title
      ? ` title="${escapeAttribute(span.segment.title)}"`
      : ''
    content = `<a href="${escapeAttribute(span.segment.href)}"${title}>${content}</a>`
  }

  const direction = span.bidiLevel % 2 === 1 ? 'rtl' : 'ltr'
  return `<span dir="${direction}">${content}</span>`
}

function renderPreparedLines(prepared, width, className) {
  const lines = []
  let cursor = { index: 0, y: 0, lineNumber: 0 }
  let lastBottom = 0

  while (true) {
    const next = layoutNextLine(prepared, cursor, width)
    if (!next) break
    const line = materializeLineRange(prepared, next.line)
    lines.push(`
      <div class="${className}" style="transform: translateY(${Math.round(line.y)}px)">
        ${line.spans.map(renderRichSpan).join('')}
      </div>
    `)
    lastBottom = line.y + prepared.baseStyle.lineHeight
    cursor = next.nextCursor
  }

  return {
    height: Math.max(lastBottom, prepared.baseStyle.lineHeight),
    lineCount: cursor.lineNumber,
    html: `<div class="flow-frame" style="height:${Math.ceil(Math.max(lastBottom, prepared.baseStyle.lineHeight))}px">${lines.join('')}</div>`
  }
}

function lineClassNameForBlock(block) {
  return {
    heading: 'flow-line flow-line-heading',
    lede: 'flow-line flow-line-lede',
    paragraph: 'flow-line flow-line-body',
    list: 'flow-line flow-line-body',
    quote: 'flow-line flow-line-note'
  }[block.kind] || 'flow-line flow-line-body'
}

function renderTextBlock(block, width) {
  const rendered = renderPreparedLines(block.prepared, width, lineClassNameForBlock(block))
  return {
    ...rendered,
    html: `<div class="flow-block flow-block-${block.kind}">${rendered.html}</div>`
  }
}

function renderImageBlock(block, width) {
  const imageWidth = Math.max(220, width)
  const imageHeight = imageWidth / (block.ratio || 4 / 3)
  const captionHeight = block.alt ? 42 : 0

  return {
    height: imageHeight + captionHeight,
    html: `
      <figure class="feature-figure">
        <img src="${escapeAttribute(block.src)}" alt="${escapeAttribute(block.alt)}">
        ${block.alt ? `<figcaption>${escapeHtml(block.alt)}</figcaption>` : ''}
      </figure>
    `
  }
}

function renderCodeBlock(block, width) {
  const innerWidth = Math.max(180, width - 56)
  const rendered = renderPreparedLines(block.prepared, innerWidth, 'flow-line flow-line-code')
  const header = block.lang
    ? `<div class="feature-code-label">${escapeHtml(block.lang)}</div>`
    : ''

  return {
    height: rendered.height + 56 + (block.lang ? 28 : 0),
    html: `
      <div class="feature-code">
        ${header}
        ${rendered.html}
      </div>
    `
  }
}

function measureTableLayout(block, width) {
  const columnCount = Math.max(block.headers.length, block.rows[0]?.length || 0, 1)
  const innerWidth = Math.max(220, width - 28)
  const rawColumnWidths = new Array(columnCount).fill(Math.max(110, innerWidth / columnCount))

  const measureCell = (text) => {
    const prepared = prepareText(String(text || ''), TEXT_STYLES.table)
    const result = layout(prepared, Math.max(80, innerWidth / columnCount - 28))
    return {
      width: Math.max(90, Math.min(innerWidth, prepared.widths.reduce((sum, value) => sum + value, 0) + 24)),
      lineCount: Math.max(result.lineCount, 1)
    }
  }

  for (let index = 0; index < columnCount; index += 1) {
    rawColumnWidths[index] = Math.max(rawColumnWidths[index], measureCell(block.headers[index] || '').width)
    for (const row of block.rows) {
      rawColumnWidths[index] = Math.max(rawColumnWidths[index], measureCell(row[index] || '').width)
    }
  }

  const totalWidth = rawColumnWidths.reduce((sum, value) => sum + value, 0)
  const scale = totalWidth > innerWidth ? innerWidth / totalWidth : 1
  const columnWidths = rawColumnWidths.map((value) => Math.max(92, value * scale))

  let height = block.headers.length > 0 ? TEXT_STYLES.table.lineHeight + 24 : 0
  for (const row of block.rows) {
    let rowLines = 1
    row.forEach((cell, index) => {
      const prepared = prepareText(String(cell || ''), TEXT_STYLES.table)
      const result = layout(prepared, Math.max(72, columnWidths[index] - 26))
      rowLines = Math.max(rowLines, result.lineCount)
    })
    height += rowLines * TEXT_STYLES.table.lineHeight + 20
  }

  return {
    columnWidths,
    height: height + 32
  }
}

function renderTableBlock(block, width) {
  const { columnWidths, height } = measureTableLayout(block, width)
  const colgroup = `<colgroup>${columnWidths.map((value) => `<col style="width:${Math.round(value)}px">`).join('')}</colgroup>`
  const headerHtml = block.headers.length > 0
    ? `<thead><tr>${block.headers.map((cell) => `<th>${escapeHtml(cell)}</th>`).join('')}</tr></thead>`
    : ''

  return {
    height,
    html: `
      <div class="feature-table-shell">
        <table class="feature-table">
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

function renderHtmlBlock(block) {
  return {
    height: 180,
    html: `<div class="feature-html">${block.html}</div>`
  }
}

function renderRailNoteBlock(block, width) {
  const rendered = renderTextBlock(block, Math.max(220, width - 28))
  return {
    height: rendered.height + 40,
    html: `<aside class="note-region">${rendered.html}</aside>`
  }
}

function blockClassName(block) {
  return [
    'stage-item',
    `stage-item-${block.kind}`,
    block.variant ? `stage-item-${block.variant}` : ''
  ]
    .filter(Boolean)
    .join(' ')
}

function createStageItem(block, x, y, width, rendered, extraClass = '') {
  return {
    key: `${block.cacheKey || block.kind}:${Math.round(x)}:${Math.round(y)}:${Math.round(width)}`,
    x,
    y,
    width,
    height: rendered.height,
    className: `${blockClassName(block)} ${extraClass}`.trim(),
    html: rendered.html
  }
}

function syncColumns(y) {
  return {
    mainY: y,
    sideY: y
  }
}

function narrativeSpacingFor(block, nextBlock) {
  if (!nextBlock) return 0
  if (block.kind === 'paragraph' && nextBlock.kind === 'paragraph') return 16
  if (block.kind === 'paragraph' && nextBlock.kind === 'list') return 20
  if (block.kind === 'list' && nextBlock.kind === 'paragraph') return 18
  if (block.kind === 'quote') return 18
  return 14
}

function createObstacleGeometry(totalWidth, obstacles, gutter = 24) {
  const ordered = [...obstacles].sort((left, right) => left.top - right.top)
  return {
    resolveLine(y, lineHeight) {
      const active = ordered.find((obstacle) => y < obstacle.bottom && y + lineHeight > obstacle.top)
      if (!active) {
        return {
          x: 0,
          y,
          width: totalWidth,
          column: 'main'
        }
      }

      return {
        x: 0,
        y,
        width: Math.max(220, active.x - gutter),
        column: 'main'
      }
    }
  }
}

function renderNarrativeSequence(blocks, startY, totalWidth, obstacles = []) {
  const geometry = createObstacleGeometry(totalWidth, obstacles)
  const htmlParts = []
  let currentY = startY
  let lineNumber = 0

  blocks.forEach((block, index) => {
    let cursor = { index: 0, y: currentY, lineNumber }

    while (true) {
      const next = layoutNextLine(block.prepared, cursor, geometry)
      if (!next) break

      const line = materializeLineRange(block.prepared, next.line)
      const localY = Math.round(line.y - startY)
      const localX = Math.round(line.x)
      htmlParts.push(`
        <div class="${lineClassNameForBlock(block)}" style="transform: translate(${localX}px, ${localY}px)">
          ${line.spans.map(renderRichSpan).join('')}
        </div>
      `)
      cursor = next.nextCursor
      lineNumber = cursor.lineNumber
    }

    currentY = cursor.y + narrativeSpacingFor(block, blocks[index + 1])
  })

  const occupiedBottom = obstacles.reduce((max, obstacle) => Math.max(max, obstacle.bottom), startY)
  const endY = Math.max(currentY, occupiedBottom)

  return {
    height: Math.max(endY - startY, 0),
    endY,
    html: `<div class="flow-frame flow-frame-narrative" style="height:${Math.ceil(Math.max(endY - startY, 0))}px">${htmlParts.join('')}</div>`
  }
}

export function composeDynamicLayout(preparedDynamicDocument, metrics) {
  const cacheKey = JSON.stringify({
    previewWidth: metrics.previewWidth,
    mainWidth: metrics.mainWidth,
    sideWidth: metrics.sideWidth,
    wide: metrics.wide,
    blockKeys: preparedDynamicDocument.blocks.map((block) => block.cacheKey || block.kind)
  })

  if (preparedDynamicDocument.spreadCache?.has(cacheKey)) {
    return preparedDynamicDocument.spreadCache.get(cacheKey)
  }

  const items = []
  let currentY = 0
  let sideY = 0
  const pendingNarrative = []
  const pendingObstacles = []

  const flushNarrative = () => {
    if (pendingNarrative.length === 0) {
      if (pendingObstacles.length > 0) {
        currentY = Math.max(currentY, ...pendingObstacles.map((obstacle) => obstacle.bottom)) + 28
        sideY = currentY
        pendingObstacles.length = 0
      }
      return
    }

    const rendered = renderNarrativeSequence(
      pendingNarrative.splice(0),
      currentY,
      metrics.previewWidth,
      pendingObstacles
    )

    items.push({
      key: `narrative:${Math.round(currentY)}:${rendered.height}`,
      x: 0,
      y: currentY,
      width: metrics.previewWidth,
      height: rendered.height,
      className: 'stage-item stage-item-narrative',
      html: rendered.html
    })

    currentY = rendered.endY + 30
    sideY = Math.max(sideY, ...pendingObstacles.map((obstacle) => obstacle.bottom), currentY)
    pendingObstacles.length = 0
  }

  const placeFull = (block, rendered, width = metrics.previewWidth) => {
    flushNarrative()
    const y = Math.max(currentY, sideY)
    items.push(createStageItem(block, 0, y, width, rendered, 'stage-item-full'))
    const synced = syncColumns(y + rendered.height + 30)
    currentY = synced.mainY
    sideY = synced.sideY
  }

  const placeRail = (block, rendered) => {
    const top = pendingObstacles.length === 0
      ? currentY + 16
      : Math.max(sideY + 24, currentY + 160)
    const obstacle = {
      top,
      bottom: top + rendered.height,
      x: metrics.sideX,
      width: metrics.sideWidth
    }
    pendingObstacles.push(obstacle)
    items.push(createStageItem(block, obstacle.x, obstacle.top, metrics.sideWidth, rendered, 'stage-item-rail'))
    sideY = obstacle.bottom
  }

  for (const block of preparedDynamicDocument.blocks) {
    switch (block.kind) {
      case 'heading': {
        const rendered = renderTextBlock(block, metrics.wide ? Math.min(metrics.previewWidth, 980) : metrics.previewWidth)
        placeFull(block, rendered)
        break
      }

      case 'lede': {
        const rendered = renderTextBlock(block, metrics.wide ? Math.min(metrics.previewWidth, 920) : metrics.previewWidth)
        placeFull(block, rendered, metrics.wide ? Math.min(metrics.previewWidth, 920) : metrics.previewWidth)
        break
      }

      case 'paragraph':
      case 'list': {
        pendingNarrative.push(block)
        break
      }

      case 'quote': {
        const noteRegion = renderRailNoteBlock(block, metrics.wide ? metrics.sideWidth : metrics.previewWidth)
        if (metrics.wide && block.placementHint === 'rail') {
          placeRail(block, noteRegion)
        } else {
          placeFull(block, noteRegion)
        }
        break
      }

      case 'image': {
        const rendered = renderImageBlock(block, metrics.wide ? metrics.sideWidth : metrics.previewWidth)
        if (metrics.wide && block.placementHint === 'rail') {
          placeRail(block, rendered)
        } else {
          placeFull(block, renderImageBlock(block, metrics.previewWidth))
        }
        break
      }

      case 'code': {
        const rendered = renderCodeBlock(block, metrics.previewWidth)
        placeFull(block, rendered)
        break
      }

      case 'table': {
        const rendered = renderTableBlock(block, metrics.previewWidth)
        placeFull(block, rendered)
        break
      }

      default: {
        const rendered = renderHtmlBlock(block)
        placeFull(block, rendered)
        break
      }
    }
  }

  flushNarrative()

  const result = {
    height: Math.max(currentY, sideY),
    items
  }

  preparedDynamicDocument.spreadCache?.set(cacheKey, result)
  return result
}
