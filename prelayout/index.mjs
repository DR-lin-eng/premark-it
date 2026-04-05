const PREPARED_KIND = 'premark-prelayout-prepared-v1'
const RTL_RE = /[\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC]/
const CJK_RE = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/
const WORDISH_RE = /[\p{L}\p{N}\p{M}_]/u
const NUMERIC_RE = /[\p{N}%$¥€£.,/:+-]/u
const URLISH_RE = /[A-Za-z0-9\-._~:/?#\[\]@!$&'()*+,;=%]/
const OPENING_PUNCT_RE = /[([{"'“‘《「『〈〔【]/
const CLOSING_PUNCT_RE = /[)\]}"'”’》」』〉〕】、。，．？！：；,.;!?]/
const WORD_CONNECTOR_RE = /['’_-]/u
const TRAILING_URL_PUNCT_RE = /[),.;!?]+$/
const URL_TOKEN_RE = /(?:https?:\/\/|www\.)\S+/i
const NUMERIC_TOKEN_RE = /\p{N}[\p{N}.,/:-]*\p{N}|\p{N}+/u
const SEGMENTER_CACHE = new Map()
const WIDTH_CACHE = new Map()
const DOM_CORRECTION_CACHE = new Map()

const ENGINE_PROFILES = {
  chromium: {
    id: 'chromium',
    lineFitEpsilon: 0.35,
    carryCJKAfterClosingQuote: true,
    preferPrefixWidthsForBreakableRuns: true,
    preferEarlySoftHyphenBreak: false
  },
  firefox: {
    id: 'firefox',
    lineFitEpsilon: 0.45,
    carryCJKAfterClosingQuote: false,
    preferPrefixWidthsForBreakableRuns: true,
    preferEarlySoftHyphenBreak: true
  },
  webkit: {
    id: 'webkit',
    lineFitEpsilon: 0.4,
    carryCJKAfterClosingQuote: true,
    preferPrefixWidthsForBreakableRuns: false,
    preferEarlySoftHyphenBreak: false
  },
  generic: {
    id: 'generic',
    lineFitEpsilon: 0.4,
    carryCJKAfterClosingQuote: true,
    preferPrefixWidthsForBreakableRuns: true,
    preferEarlySoftHyphenBreak: false
  }
}

const DEFAULT_STYLE = {
  fontFamily: 'system-ui, sans-serif',
  fontSize: 16,
  lineHeight: 24,
  fontWeight: 400,
  italic: false,
  letterSpacing: 0,
  whiteSpace: 'normal',
  keepAll: false,
  tabSize: 4
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function styleToFont(style) {
  const fontStyle = style.italic ? 'italic ' : ''
  return `${fontStyle}${style.fontWeight} ${style.fontSize}px ${style.fontFamily}`
}

function fontKey(style) {
  return [
    style.fontFamily,
    style.fontSize,
    style.fontWeight,
    style.italic ? 'italic' : 'normal',
    style.letterSpacing || 0
  ].join('|')
}

function detectEngineProfile() {
  const userAgent = globalThis.navigator?.userAgent || ''
  if (/firefox/i.test(userAgent)) return ENGINE_PROFILES.firefox
  if (/safari/i.test(userAgent) && !/chrome|chromium|android/i.test(userAgent)) return ENGINE_PROFILES.webkit
  if (/chrome|chromium|edg/i.test(userAgent)) return ENGINE_PROFILES.chromium
  return ENGINE_PROFILES.generic
}

function getSegmenter(locale, granularity) {
  if (typeof Intl?.Segmenter !== 'function') {
    return null
  }

  const key = `${locale || 'und'}:${granularity}`
  if (!SEGMENTER_CACHE.has(key)) {
    SEGMENTER_CACHE.set(key, new Intl.Segmenter(locale, { granularity }))
  }
  return SEGMENTER_CACHE.get(key)
}

function splitGraphemes(text, locale) {
  const segmenter = getSegmenter(locale, 'grapheme')
  if (!segmenter) {
    return Array.from(text)
  }
  return Array.from(segmenter.segment(text), (entry) => entry.segment)
}

function isSpaceLike(char) {
  return /[ \f\v\u00a0\u2000-\u200a\u202f\u205f\u3000]/.test(char)
}

function isWordish(char) {
  return WORDISH_RE.test(char)
}

function isWordConnector(char) {
  return WORD_CONNECTOR_RE.test(char)
}

function isNumericLike(char) {
  return NUMERIC_RE.test(char)
}

function isUrlish(char) {
  return URLISH_RE.test(char)
}

function isDigitChar(char) {
  return /\p{N}/u.test(char)
}

function isRTL(char) {
  return RTL_RE.test(char)
}

function isCJK(char) {
  return CJK_RE.test(char)
}

function isOpeningPunctuation(char) {
  return OPENING_PUNCT_RE.test(char)
}

function isClosingPunctuation(char) {
  return CLOSING_PUNCT_RE.test(char)
}

function isPunctuationLike(char) {
  return (
    !isWordish(char) &&
    !isSpaceLike(char) &&
    !isCJK(char) &&
    char !== '\n' &&
    char !== '\r' &&
    char !== '\t' &&
    char !== '\u00ad' &&
    char !== '\u200b'
  )
}

function splitWordSegments(text, locale) {
  const segmenter = getSegmenter(locale, 'word')
  if (!segmenter) {
    return [text]
  }

  const segments = Array.from(segmenter.segment(text), (entry) => ({
    text: entry.segment,
    isWordLike: Boolean(entry.isWordLike)
  }))

  return segments.length > 0 ? segments : [{ text, isWordLike: true }]
}

function createCanvasContext() {
  if (typeof OffscreenCanvas === 'function') {
    const canvas = new OffscreenCanvas(1, 1)
    return canvas.getContext('2d')
  }

  if (globalThis.document?.createElement) {
    const canvas = globalThis.document.createElement('canvas')
    return canvas.getContext?.('2d') || null
  }

  return null
}

function measureDomCorrection(style, sampleText, canvasWidth) {
  const key = `${fontKey(style)}::${sampleText}`
  if (DOM_CORRECTION_CACHE.has(key)) {
    return DOM_CORRECTION_CACHE.get(key)
  }

  const body = globalThis.document?.body
  if (!body?.appendChild || typeof globalThis.document.createElement !== 'function') {
    DOM_CORRECTION_CACHE.set(key, 1)
    return 1
  }

  try {
    const node = globalThis.document.createElement('span')
    node.textContent = sampleText
    node.style.position = 'absolute'
    node.style.visibility = 'hidden'
    node.style.whiteSpace = 'pre'
    node.style.top = '-9999px'
    node.style.left = '0'
    node.style.fontFamily = style.fontFamily
    node.style.fontSize = `${style.fontSize}px`
    node.style.fontWeight = String(style.fontWeight)
    node.style.fontStyle = style.italic ? 'italic' : 'normal'
    node.style.letterSpacing = `${style.letterSpacing || 0}px`
    body.appendChild(node)
    const domWidth = typeof node.getBoundingClientRect === 'function'
      ? node.getBoundingClientRect().width
      : 0
    body.removeChild?.(node)

    if (!domWidth || !canvasWidth) {
      DOM_CORRECTION_CACHE.set(key, 1)
      return 1
    }

    const ratio = domWidth / canvasWidth
    const correction = Math.abs(1 - ratio) > 0.035 ? ratio : 1
    DOM_CORRECTION_CACHE.set(key, correction)
    return correction
  } catch {
    DOM_CORRECTION_CACHE.set(key, 1)
    return 1
  }
}

function createMeasure(style, options = {}) {
  const context = createCanvasContext()
  const keyPrefix = fontKey(style)
  const sampleText = options.sampleText || 'ffi 😀🙂🚀 你好 مرحبا'
  const font = styleToFont(style)

  let domCorrection = 1
  let domCalibrationUsed = false

  function rawMeasure(text) {
    const key = `${keyPrefix}\u0000${text}`
    if (WIDTH_CACHE.has(key)) {
      return WIDTH_CACHE.get(key)
    }

    let width
    if (context) {
      context.font = font
      width = context.measureText(text).width
    } else {
      width = text.length * style.fontSize * 0.58
    }

    if (style.letterSpacing) {
      width += Math.max(0, Array.from(text).length - 1) * style.letterSpacing
    }

    WIDTH_CACHE.set(key, width)
    return width
  }

  const sampleWidth = rawMeasure(sampleText)
  if (options.enableDomCorrection !== false) {
    domCorrection = measureDomCorrection(style, sampleText, sampleWidth)
    domCalibrationUsed = domCorrection !== 1
  }

  function measure(text) {
    return rawMeasure(text) * domCorrection
  }

  return {
    measure,
    domCorrection,
    domCalibrationUsed,
    font,
    fontKey: keyPrefix
  }
}

function mergeStyle(baseStyle, segment) {
  return {
    ...baseStyle,
    ...(segment.style || {}),
    fontWeight: segment.code ? 500 : (segment.strong ? 700 : (segment.style?.fontWeight ?? baseStyle.fontWeight)),
    italic: Boolean(segment.em) || Boolean(segment.style?.italic) || Boolean(baseStyle.italic),
    fontFamily: segment.code
      ? (segment.style?.fontFamily || baseStyle.codeFontFamily || baseStyle.fontFamily)
      : (segment.style?.fontFamily || baseStyle.fontFamily),
    whiteSpace: segment.style?.whiteSpace || baseStyle.whiteSpace,
    keepAll: segment.style?.keepAll ?? baseStyle.keepAll
  }
}

function normalizeSegments(input) {
  if (!Array.isArray(input)) {
    throw new Error('Rich text input should be an Array')
  }

  const normalized = []

  for (const item of input) {
    if (!item) continue

    if (typeof item === 'string') {
      normalized.push({ text: item })
      continue
    }

    if (item.kind === 'hardbreak' || item.break === 'hard') {
      normalized.push({ kind: 'hardbreak' })
      continue
    }

    if (item.kind === 'softbreak' || item.break === 'soft') {
      normalized.push({ text: ' ' })
      continue
    }

    if (item.kind === 'tab') {
      normalized.push({ text: '\t', style: item.style || {}, ...item })
      continue
    }

    const text = String(item.text ?? '')
    if (text.length === 0) continue
    normalized.push({ ...item, text })
  }

  return normalized
}

function bidiLevelForSegment(segment) {
  const text = segment.text || ''
  return RTL_RE.test(text) ? 1 : 0
}

function pushTextUnit(units, text, segmentIndex, styleIndex, segment, analysisKind) {
  if (!text) return

  const graphemes = splitGraphemes(text)
  const bidiLevel = bidiLevelForSegment(segment)
  const isCjkKind = analysisKind === 'cjk'
  const isWordKind = analysisKind === 'word'
  const isNumericKind = analysisKind === 'numeric'
  const isUrlKind = analysisKind === 'url'
  const isOpeningKind = analysisKind === 'openingPunct'
  const isClosingKind = analysisKind === 'closingPunct'

  units.push({
    kind: 'text',
    text,
    segmentIndex,
    styleIndex,
    bidiLevel,
    analysisKind,
    isWhitespace: false,
    isWordish: isWordKind || graphemes.every((grapheme) => isWordish(grapheme) || isWordConnector(grapheme)),
    isNumeric: isNumericKind,
    isUrlish: isUrlKind,
    isRTL: graphemes.some((grapheme) => isRTL(grapheme)),
    isCJK: isCjkKind || graphemes.every((grapheme) => isCJK(grapheme)),
    isOpeningPunctuation: isOpeningKind || graphemes.every((grapheme) => isOpeningPunctuation(grapheme)),
    isClosingPunctuation: isClosingKind || graphemes.every((grapheme) => isClosingPunctuation(grapheme))
  })
}

function stripTrailingUrlPunctuation(text) {
  const match = TRAILING_URL_PUNCT_RE.exec(text)
  if (!match) {
    return { url: text, trailing: '' }
  }

  const trailing = match[0]
  return {
    url: text.slice(0, -trailing.length),
    trailing
  }
}

function isUrlLikeText(text) {
  return /^(?:https?:\/\/|www\.)\S+$/i.test(text)
}

function classifyTextPiece(piece) {
  const graphemes = splitGraphemes(piece)
  if (graphemes.length === 0) return null

  if (isUrlLikeText(piece)) return 'url'
  if (graphemes.every((grapheme) => isCJK(grapheme))) return 'cjk'
  if (graphemes.every((grapheme) => isDigitChar(grapheme) || isNumericLike(grapheme)) && graphemes.some((grapheme) => isDigitChar(grapheme))) {
    return 'numeric'
  }
  if (graphemes.every((grapheme) => isWordish(grapheme) || isWordConnector(grapheme))) return 'word'
  if (graphemes.every((grapheme) => isOpeningPunctuation(grapheme))) return 'openingPunct'
  if (graphemes.every((grapheme) => isClosingPunctuation(grapheme))) return 'closingPunct'
  if (graphemes.every((grapheme) => isPunctuationLike(grapheme))) return 'punct'
  return 'mixed'
}

function fallbackChunkScan(text, segmentIndex, styleIndex, segment, units) {
  const graphemes = splitGraphemes(text)

  for (let index = 0; index < graphemes.length;) {
    const current = graphemes[index]

    if (isCJK(current)) {
      pushTextUnit(units, current, segmentIndex, styleIndex, segment, 'cjk')
      index += 1
      continue
    }

    if (isDigitChar(current)) {
      let nextIndex = index + 1
      while (nextIndex < graphemes.length && (isDigitChar(graphemes[nextIndex]) || isNumericLike(graphemes[nextIndex]))) {
        nextIndex += 1
      }
      pushTextUnit(units, graphemes.slice(index, nextIndex).join(''), segmentIndex, styleIndex, segment, 'numeric')
      index = nextIndex
      continue
    }

    if (isWordish(current) || isWordConnector(current) || isRTL(current)) {
      let nextIndex = index + 1
      while (
        nextIndex < graphemes.length &&
        (isWordish(graphemes[nextIndex]) || isWordConnector(graphemes[nextIndex]) || isRTL(graphemes[nextIndex]))
      ) {
        nextIndex += 1
      }
      pushTextUnit(units, graphemes.slice(index, nextIndex).join(''), segmentIndex, styleIndex, segment, 'word')
      index = nextIndex
      continue
    }

    let nextIndex = index + 1
    while (nextIndex < graphemes.length && isPunctuationLike(graphemes[nextIndex])) {
      nextIndex += 1
    }
    const punct = graphemes.slice(index, nextIndex).join('')
    pushTextUnit(units, punct, segmentIndex, styleIndex, segment, classifyTextPiece(punct) || 'punct')
    index = nextIndex
  }
}

function appendNonUrlUnits(text, segmentIndex, styleIndex, segment, locale, units) {
  if (!text) {
    return
  }
  const wordSegments = splitWordSegments(text, locale)
  for (const entry of wordSegments) {
    const piece = entry.text
    if (!piece) continue

    const analysisKind = classifyTextPiece(piece)
    if (analysisKind === 'mixed') {
      fallbackChunkScan(piece, segmentIndex, styleIndex, segment, units)
      continue
    }

    if (analysisKind === 'cjk') {
      for (const grapheme of splitGraphemes(piece, locale)) {
        pushTextUnit(units, grapheme, segmentIndex, styleIndex, segment, 'cjk')
      }
      continue
    }

    pushTextUnit(units, piece, segmentIndex, styleIndex, segment, analysisKind || 'word')
  }
}

function chunkToUnits(text, segmentIndex, styleIndex, segment, locale, units) {
  if (!text) return

  let remaining = text
  while (remaining.length > 0) {
    const nextUrlIndex = remaining.search(URL_TOKEN_RE)
    const nextNumericIndex = remaining.search(NUMERIC_TOKEN_RE)
    const candidateIndexes = [nextUrlIndex, nextNumericIndex].filter((value) => value >= 0)
    const nextSpecialIndex = candidateIndexes.length > 0 ? Math.min(...candidateIndexes) : -1

    if (nextSpecialIndex === -1) {
      appendNonUrlUnits(remaining, segmentIndex, styleIndex, segment, locale, units)
      break
    }

    if (nextSpecialIndex > 0) {
      appendNonUrlUnits(remaining.slice(0, nextSpecialIndex), segmentIndex, styleIndex, segment, locale, units)
      remaining = remaining.slice(nextSpecialIndex)
      continue
    }

    if (nextUrlIndex === 0) {
      const match = URL_TOKEN_RE.exec(remaining)
      const rawUrl = match?.[0] || ''
      const { url, trailing } = stripTrailingUrlPunctuation(rawUrl)
      pushTextUnit(units, url, segmentIndex, styleIndex, segment, 'url')
      if (trailing) {
        pushTextUnit(units, trailing, segmentIndex, styleIndex, segment, classifyTextPiece(trailing) || 'punct')
      }
      remaining = remaining.slice(rawUrl.length)
      continue
    }

    const numericMatch = NUMERIC_TOKEN_RE.exec(remaining)
    const numericText = numericMatch?.[0] || ''
    pushTextUnit(units, numericText, segmentIndex, styleIndex, segment, 'numeric')
    remaining = remaining.slice(numericText.length)
  }
}

function pushCollapsibleSpace(units, segmentIndex, segment, styleIndex) {
  const previous = units[units.length - 1]
  if (previous?.kind === 'space') {
    return
  }

  units.push({
    kind: 'space',
    text: ' ',
    segmentIndex,
    styleIndex,
    bidiLevel: bidiLevelForSegment(segment),
    isWhitespace: true,
    isDiscardableAtLineStart: true,
    isDiscardableAtLineEnd: true
  })
}

function segmentToUnits(segment, segmentIndex, styleIndex, style, locale) {
  const units = []
  const graphemes = splitGraphemes(segment.text || '', locale)
  const preserveSpaces = style.whiteSpace === 'pre-wrap'
  let pendingCollapsedSpace = false
  let pendingTextChunk = ''

  const flushCollapsedSpace = () => {
    if (!pendingCollapsedSpace) return
    flushTextChunk()
    pushCollapsibleSpace(units, segmentIndex, segment, styleIndex)
    pendingCollapsedSpace = false
  }

  const flushTextChunk = () => {
    if (!pendingTextChunk) return
    chunkToUnits(pendingTextChunk, segmentIndex, styleIndex, segment, locale, units)
    pendingTextChunk = ''
  }

  for (const grapheme of graphemes) {
    if (grapheme === '\r') {
      continue
    }

    if (grapheme === '\n') {
      flushCollapsedSpace()
      flushTextChunk()
      units.push({
        kind: 'hardbreak',
        text: '\n',
        segmentIndex,
        styleIndex,
        bidiLevel: bidiLevelForSegment(segment),
        isWhitespace: true
      })
      continue
    }

    if (grapheme === '\t') {
      if (!preserveSpaces) {
        pendingCollapsedSpace = true
        continue
      }

      flushCollapsedSpace()
      flushTextChunk()
      units.push({
        kind: 'tab',
        text: grapheme,
        segmentIndex,
        styleIndex,
        bidiLevel: bidiLevelForSegment(segment),
        isWhitespace: true,
        isDiscardableAtLineEnd: true
      })
      continue
    }

    if (grapheme === '\u00ad') {
      flushCollapsedSpace()
      flushTextChunk()
      units.push({
        kind: 'softHyphen',
        text: grapheme,
        segmentIndex,
        styleIndex,
        bidiLevel: bidiLevelForSegment(segment)
      })
      continue
    }

    if (grapheme === '\u200b') {
      flushCollapsedSpace()
      flushTextChunk()
      units.push({
        kind: 'zwsp',
        text: grapheme,
        segmentIndex,
        styleIndex,
        bidiLevel: bidiLevelForSegment(segment),
        isDiscardableAtLineEnd: true
      })
      continue
    }

    if (isSpaceLike(grapheme)) {
      if (preserveSpaces) {
        flushCollapsedSpace()
        flushTextChunk()
        units.push({
          kind: 'space',
          text: grapheme,
          segmentIndex,
          styleIndex,
          bidiLevel: bidiLevelForSegment(segment),
          isWhitespace: true,
          isDiscardableAtLineEnd: true
        })
      } else {
        pendingCollapsedSpace = true
      }
      continue
    }

    flushCollapsedSpace()
    pendingTextChunk += grapheme
  }

  flushCollapsedSpace()
  flushTextChunk()

  return units
}

function shouldGlueUnits(current, next, profile, keepAll) {
  if (!current || !next) return false
  if (current.kind !== 'text' || next.kind !== 'text') {
    return false
  }

  if (current.isOpeningPunctuation || next.isClosingPunctuation) {
    return true
  }

  if (next.isOpeningPunctuation) {
    return true
  }

  if (current.isCJK || next.isCJK) {
    if (keepAll) return true
    if (profile.carryCJKAfterClosingQuote && next.isClosingPunctuation) {
      return true
    }
    return false
  }

  if (current.analysisKind === 'url' || next.analysisKind === 'url') {
    return current.analysisKind === 'url' && next.analysisKind === 'url'
  }

  if ((current.isWordish && next.isWordish) || (current.isNumeric && next.isNumeric)) {
    return true
  }

  if (current.isUrlish && next.isUrlish) {
    return true
  }

  if (current.isRTL && next.isRTL && (current.isWordish || next.isWordish)) {
    return true
  }

  return false
}

function analyzeUnits(units, preparedStyle, profile, styleProfiles) {
  const chunks = []
  const breakKinds = new Array(units.length).fill('none')
  let chunkStart = 0

  for (let index = 0; index < units.length; index += 1) {
    const unit = units[index]
    const next = units[index + 1]
    const style = styleProfiles[unit.styleIndex]

    if (unit.kind === 'hardbreak') {
      unit.breakAfter = true
      unit.breakKind = 'hardbreak'
      breakKinds[index] = 'hardbreak'
      chunks.push([chunkStart, index])
      chunkStart = index + 1
      continue
    }

    if (unit.kind === 'space') {
      unit.breakAfter = true
      unit.breakKind = 'space'
      breakKinds[index] = 'space'
      continue
    }

    if (unit.kind === 'tab') {
      unit.breakAfter = true
      unit.breakKind = 'tab'
      breakKinds[index] = 'tab'
      continue
    }

    if (unit.kind === 'zwsp') {
      unit.breakAfter = true
      unit.breakKind = 'zwsp'
      breakKinds[index] = 'zwsp'
      continue
    }

    if (unit.kind === 'softHyphen') {
      unit.breakAfter = true
      unit.breakKind = 'softHyphen'
      breakKinds[index] = 'softHyphen'
      continue
    }

    unit.breakAfter = !shouldGlueUnits(unit, next, profile, style.keepAll ?? preparedStyle.keepAll)
    if (unit.breakAfter) {
      breakKinds[index] = unit.isCJK ? 'cjk' : 'text'
    }
  }

  chunks.push([chunkStart, units.length])
  return { chunks, breakKinds }
}

function enrichMeasurements(units, styleProfiles, preparedStyle, options, profile) {
  const styleMeasurers = styleProfiles.map((style) => createMeasure(style, options))
  const widths = []
  const fitAdvances = []
  const paintAdvances = []
  const fitPrefix = [0]
  const paintPrefix = [0]
  const measuredStyles = []

  for (const unit of units) {
    const style = styleProfiles[unit.styleIndex]
    const measurer = styleMeasurers[unit.styleIndex]
    measuredStyles[unit.styleIndex] = {
      font: measurer.font,
      fontKey: measurer.fontKey,
      correction: measurer.domCorrection,
      domCalibrationUsed: measurer.domCalibrationUsed
    }

    let fitAdvance = 0
    let paintAdvance = 0
    let width = 0

    if (unit.kind === 'text' || unit.kind === 'space') {
      width = measurer.measure(unit.text)
      fitAdvance = width
      paintAdvance = width
    } else if (unit.kind === 'tab') {
      const tabText = ' '.repeat(style.tabSize || preparedStyle.tabSize || 4)
      width = measurer.measure(tabText)
      fitAdvance = width
      paintAdvance = width
      unit.text = tabText
    } else if (unit.kind === 'softHyphen') {
      width = measurer.measure('-')
      fitAdvance = 0
      paintAdvance = width
    }

    unit.width = width
    unit.fitAdvance = fitAdvance
    unit.paintAdvance = paintAdvance
    widths.push(width)
    fitAdvances.push(fitAdvance)
    paintAdvances.push(paintAdvance)
    fitPrefix.push(fitPrefix[fitPrefix.length - 1] + fitAdvance)
    paintPrefix.push(paintPrefix[paintPrefix.length - 1] + paintAdvance)
  }

  return {
    widths,
    fitAdvances,
    paintAdvances,
    fitPrefix,
    paintPrefix,
    measuredStyles
  }
}

function computeBreakablePrefixWidths(units, fitPrefix) {
  const prefixWidths = new Array(units.length).fill(null)

  for (let index = 0; index < units.length; index += 1) {
    const unit = units[index]
    if (!unit.breakAfter) continue

    let visibleEnd = index + 1
    while (visibleEnd > 0 && units[visibleEnd - 1]?.isDiscardableAtLineEnd) {
      visibleEnd -= 1
    }

    prefixWidths[index] = fitPrefix[visibleEnd]
  }

  return prefixWidths
}

function computeLineEndAdvances(units, fitPrefix, paintPrefix) {
  const lineEndFitAdvances = new Array(units.length).fill(null)
  const lineEndPaintAdvances = new Array(units.length).fill(null)

  for (let index = 0; index < units.length; index += 1) {
    const unit = units[index]
    if (!unit.breakAfter) continue

    let visibleEnd = index + 1
    while (visibleEnd > 0 && units[visibleEnd - 1]?.isDiscardableAtLineEnd) {
      visibleEnd -= 1
    }

    lineEndFitAdvances[index] = fitPrefix[visibleEnd]
    lineEndPaintAdvances[index] =
      paintPrefix[visibleEnd] + (unit.kind === 'softHyphen' ? unit.paintAdvance || 0 : 0)
  }

  return {
    lineEndFitAdvances,
    lineEndPaintAdvances
  }
}

function buildPrepared(normalizedSegments, preparedStyle, options) {
  const profile = detectEngineProfile()
  const styleProfiles = normalizedSegments
    .map((segment) => mergeStyle(preparedStyle, segment))

  const units = []
  normalizedSegments.forEach((segment, segmentIndex) => {
    units.push(...segmentToUnits(segment, segmentIndex, segmentIndex, styleProfiles[segmentIndex], options.locale))
  })

  const { chunks, breakKinds } = analyzeUnits(units, preparedStyle, profile, styleProfiles)
  const measured = enrichMeasurements(units, styleProfiles, preparedStyle, options, profile)
  const breakablePrefixWidths = computeBreakablePrefixWidths(units, measured.fitPrefix)
  const lineEndAdvances = computeLineEndAdvances(units, measured.fitPrefix, measured.paintPrefix)
  const normalizedText = normalizedSegments
    .map((segment) => segment.kind === 'hardbreak' ? '\n' : segment.text)
    .join('')

  return {
    kind: PREPARED_KIND,
    normalizedText,
    segments: normalizedSegments,
    chunks,
    breakKinds,
    widths: measured.widths,
    fitAdvances: measured.fitAdvances,
    paintAdvances: measured.paintAdvances,
    breakablePrefixWidths,
    lineEndFitAdvances: lineEndAdvances.lineEndFitAdvances,
    lineEndPaintAdvances: lineEndAdvances.lineEndPaintAdvances,
    styleProfileId: `${profile.id}:${fontKey(preparedStyle)}`,
    segLevels: normalizedSegments.map(bidiLevelForSegment),
    measurementMetadata: {
      engineProfile: profile.id,
      styles: measured.measuredStyles.filter(Boolean),
      domCalibrationUsed: measured.measuredStyles.some((entry) => entry?.domCalibrationUsed),
      correctionApplied: measured.measuredStyles.some((entry) => entry && Math.abs(1 - entry.correction) > 0.001)
    },
    baseStyle: preparedStyle,
    engineProfile: profile,
    units,
    fitPrefix: measured.fitPrefix,
    paintPrefix: measured.paintPrefix
  }
}

function normalizeStyle(style = {}) {
  return {
    ...DEFAULT_STYLE,
    ...style
  }
}

export function prepareText(text, style = {}, options = {}) {
  if (typeof text !== 'string') {
    throw new Error('Text input should be a String')
  }

  const preparedStyle = normalizeStyle(style)
  return buildPrepared([{ text }], preparedStyle, options)
}

export function prepareRichText(segments, style = {}, options = {}) {
  const preparedStyle = normalizeStyle(style)
  const normalizedSegments = normalizeSegments(segments)
  return buildPrepared(normalizedSegments, preparedStyle, options)
}

function trimLineEnd(prepared, start, endConsumed) {
  let endVisible = endConsumed
  while (endVisible > start && prepared.units[endVisible - 1]?.isDiscardableAtLineEnd) {
    endVisible -= 1
  }
  return endVisible
}

function linePaintWidth(prepared, start, endVisible, appendHyphen = false, hyphenWidth = 0) {
  return prepared.paintPrefix[endVisible] - prepared.paintPrefix[start] + (appendHyphen ? hyphenWidth : 0)
}

function lineFitWidth(prepared, start, endVisible) {
  return prepared.fitPrefix[endVisible] - prepared.fitPrefix[start]
}

function materializeRangeText(prepared, start, endVisible, appendHyphen) {
  let text = ''
  for (let index = start; index < endVisible; index += 1) {
    const unit = prepared.units[index]
    if (!unit || unit.kind === 'hardbreak' || unit.kind === 'softHyphen' || unit.kind === 'zwsp') {
      continue
    }
    text += unit.text
  }
  if (appendHyphen) text += '-'
  return text
}

function buildLineRecord(prepared, start, endConsumed, y, slot, lineNumber, appendHyphen = false) {
  const endVisible = trimLineEnd(prepared, start, appendHyphen ? endConsumed - 1 : endConsumed)
  const hyphenWidth = appendHyphen ? (prepared.units[endConsumed - 1]?.paintAdvance || 0) : 0
  return {
    start,
    endConsumed,
    endVisible,
    appendHyphen,
    text: materializeRangeText(prepared, start, endVisible, appendHyphen),
    width: linePaintWidth(prepared, start, endVisible, appendHyphen, hyphenWidth),
    fitWidth: lineFitWidth(prepared, start, endVisible),
    x: slot.x || 0,
    y,
    maxWidth: slot.width,
    column: slot.column || 'main',
    lineNumber
  }
}

function resolveLineSlot(prepared, cursor, geometry, options = {}) {
  const lineHeight = options.lineHeight || prepared.baseStyle.lineHeight

  if (typeof geometry === 'number') {
    return { x: 0, y: cursor.y, width: geometry, column: 'main', lineHeight }
  }

  if (geometry && typeof geometry.resolveLine === 'function') {
    const resolved = geometry.resolveLine(cursor.y, lineHeight, cursor, prepared)
    if (!resolved) return null
    return {
      x: resolved.x || 0,
      y: resolved.y ?? cursor.y,
      width: resolved.width,
      column: resolved.column || 'main',
      lineHeight: resolved.lineHeight || lineHeight
    }
  }

  return {
    x: geometry?.x || 0,
    y: cursor.y,
    width: geometry?.width ?? 0,
    column: geometry?.column || 'main',
    lineHeight
  }
}

function breakPenalty(unit, profile) {
  switch (unit.kind) {
    case 'space':
      return 0
    case 'tab':
      return 1
    case 'softHyphen':
      return profile.preferEarlySoftHyphenBreak ? 1 : 3
    case 'zwsp':
      return 2
    case 'text':
      if (unit.breakKind === 'cjk') return 2
      if (unit.analysisKind === 'closingPunct') return 3
      if (unit.analysisKind === 'openingPunct') return 4
      return 5
    default:
      return 6
  }
}

function candidateFitWidth(prepared, start, index, profile) {
  const endConsumed = index + 1
  const preferred = prepared.lineEndFitAdvances?.[index]
  if (profile.preferPrefixWidthsForBreakableRuns && preferred != null) {
    return preferred - prepared.fitPrefix[start]
  }
  return prepared.fitPrefix[endConsumed] - prepared.fitPrefix[start]
}

function candidatePaintWidth(prepared, start, index, profile) {
  const endConsumed = index + 1
  const preferred = prepared.lineEndPaintAdvances?.[index]
  if (profile.preferPrefixWidthsForBreakableRuns && preferred != null) {
    return preferred - prepared.paintPrefix[start]
  }

  const unit = prepared.units[index]
  const endVisible = trimLineEnd(prepared, start, endConsumed)
  return linePaintWidth(prepared, start, endVisible, unit.kind === 'softHyphen', unit.paintAdvance || 0)
}

function selectPreferredBreak(currentBest, nextCandidate, profile) {
  if (!currentBest) {
    return nextCandidate
  }

  if (nextCandidate.endConsumed > currentBest.endConsumed) {
    if (
      profile.preferEarlySoftHyphenBreak &&
      currentBest.unit.kind !== 'softHyphen' &&
      nextCandidate.unit.kind === 'softHyphen' &&
      currentBest.fitWidth - nextCandidate.fitWidth <= (nextCandidate.unit.paintAdvance || 0) * 1.4
    ) {
      return nextCandidate
    }
    return nextCandidate
  }

  if (nextCandidate.endConsumed < currentBest.endConsumed) {
    if (
      profile.preferEarlySoftHyphenBreak &&
      nextCandidate.unit.kind === 'softHyphen' &&
      currentBest.unit.kind !== 'softHyphen' &&
      currentBest.fitWidth - nextCandidate.fitWidth <= (nextCandidate.unit.paintAdvance || 0) * 1.4
    ) {
      return nextCandidate
    }
    return currentBest
  }

  if (nextCandidate.penalty < currentBest.penalty) {
    return nextCandidate
  }

  if (nextCandidate.penalty === currentBest.penalty && nextCandidate.paintWidth > currentBest.paintWidth) {
    return nextCandidate
  }

  return currentBest
}

function skipLeadingCollapsible(prepared, start) {
  let index = start
  if (prepared.baseStyle.whiteSpace === 'pre-wrap') {
    return index
  }

  while (index < prepared.units.length && prepared.units[index]?.kind === 'space') {
    index += 1
  }

  return index
}

export function layoutNextLine(prepared, cursor = { index: 0, y: 0, lineNumber: 0 }, geometry, options = {}) {
  if (!prepared || prepared.kind !== PREPARED_KIND) {
    throw new Error('layoutNextLine() expects a prepared text handle')
  }

  let start = skipLeadingCollapsible(prepared, cursor.index || 0)
  if (start >= prepared.units.length) {
    return null
  }

  const slot = resolveLineSlot(prepared, { ...cursor, index: start }, geometry, options)
  if (!slot || !Number.isFinite(slot.width) || slot.width <= 0) {
    return null
  }

  if (prepared.units[start]?.kind === 'hardbreak') {
    const line = buildLineRecord(prepared, start, start + 1, slot.y, slot, cursor.lineNumber || 0, false)
    return {
      line,
      nextCursor: {
        index: start + 1,
        y: slot.y + slot.lineHeight,
        lineNumber: (cursor.lineNumber || 0) + 1
      }
    }
  }

  let index = start
  let currentWidth = 0
  let bestBreak = null
  const epsilon = prepared.engineProfile.lineFitEpsilon

  while (index < prepared.units.length) {
    const unit = prepared.units[index]

    if (unit.kind === 'hardbreak') {
      const line = buildLineRecord(prepared, start, index, slot.y, slot, cursor.lineNumber || 0, false)
      return {
        line,
        nextCursor: {
          index: index + 1,
          y: slot.y + slot.lineHeight,
          lineNumber: (cursor.lineNumber || 0) + 1
        }
      }
    }

    const nextWidth = currentWidth + unit.fitAdvance
    if (nextWidth > slot.width + epsilon) {
      if (bestBreak && bestBreak.endConsumed > start) {
        const line = buildLineRecord(
          prepared,
          start,
          bestBreak.endConsumed,
          slot.y,
          slot,
          cursor.lineNumber || 0,
          bestBreak.appendHyphen
        )
        return {
          line,
          nextCursor: {
            index: bestBreak.endConsumed,
            y: slot.y + slot.lineHeight,
            lineNumber: (cursor.lineNumber || 0) + 1
          }
        }
      }

      const forcedEnd = Math.max(start + 1, index)
      const line = buildLineRecord(prepared, start, forcedEnd, slot.y, slot, cursor.lineNumber || 0, false)
      return {
        line,
        nextCursor: {
          index: forcedEnd,
          y: slot.y + slot.lineHeight,
          lineNumber: (cursor.lineNumber || 0) + 1
        }
      }
    }

    currentWidth = nextWidth
    if (unit.breakAfter) {
      const candidate = {
        endConsumed: index + 1,
        appendHyphen: unit.kind === 'softHyphen',
        fitWidth: candidateFitWidth(prepared, start, index, prepared.engineProfile),
        paintWidth: candidatePaintWidth(prepared, start, index, prepared.engineProfile),
        penalty: breakPenalty(unit, prepared.engineProfile),
        unit
      }
      if (candidate.fitWidth <= slot.width + epsilon) {
        bestBreak = selectPreferredBreak(bestBreak, candidate, prepared.engineProfile)
      }
    }

    index += 1
  }

  const finalEnd = bestBreak?.endConsumed || index
  const line = buildLineRecord(prepared, start, finalEnd, slot.y, slot, cursor.lineNumber || 0, bestBreak?.appendHyphen || false)
  return {
    line,
    nextCursor: {
      index: finalEnd,
      y: slot.y + slot.lineHeight,
      lineNumber: (cursor.lineNumber || 0) + 1
    }
  }
}

export function materializeLineRange(prepared, line) {
  if (!prepared || prepared.kind !== PREPARED_KIND) {
    throw new Error('materializeLineRange() expects a prepared text handle')
  }

  const spans = []

  function pushSpan(text, segment, bidiLevel) {
    if (!text) return
    const previous = spans[spans.length - 1]
    const signature = JSON.stringify({
      strong: Boolean(segment?.strong),
      em: Boolean(segment?.em),
      code: Boolean(segment?.code),
      href: segment?.href || null,
      title: segment?.title || null,
      style: segment?.style || null,
      bidiLevel
    })

    if (previous?.signature === signature) {
      previous.text += text
      return
    }

    spans.push({
      text,
      segment,
      bidiLevel,
      signature
    })
  }

  for (let index = line.start; index < line.endVisible; index += 1) {
    const unit = prepared.units[index]
    if (!unit || unit.kind === 'hardbreak' || unit.kind === 'softHyphen' || unit.kind === 'zwsp') {
      continue
    }
    const segment = prepared.segments[unit.segmentIndex] || null
    pushSpan(unit.text, segment, unit.bidiLevel)
  }

  if (line.appendHyphen) {
    const previousSegment = prepared.segments[prepared.units[Math.max(line.start, line.endConsumed - 1)]?.segmentIndex] || null
    pushSpan('-', previousSegment, previousSegment ? bidiLevelForSegment(previousSegment) : 0)
  }

  return {
    ...line,
    spans: spans.map(({ signature, ...span }) => span)
  }
}

export function walkLineRanges(prepared, width, visitor, options = {}) {
  let cursor = { index: 0, y: 0, lineNumber: 0 }

  while (true) {
    const next = layoutNextLine(prepared, cursor, width, options)
    if (!next) break
    visitor(next.line)
    cursor = next.nextCursor
  }
}

export function layoutWithLines(prepared, width, options = {}) {
  const lines = []
  walkLineRanges(prepared, width, (line) => {
    lines.push(materializeLineRange(prepared, line))
  }, options)

  const lineHeight = options.lineHeight || prepared.baseStyle.lineHeight
  return {
    lines,
    lineCount: lines.length,
    height: lines.length * lineHeight
  }
}

export function layout(prepared, width, options = {}) {
  let lineCount = 0
  walkLineRanges(prepared, width, () => {
    lineCount += 1
  }, options)

  const lineHeight = options.lineHeight || prepared.baseStyle.lineHeight
  return {
    lineCount,
    height: lineCount * lineHeight
  }
}

export function profilePrepare(prepared) {
  if (!prepared || prepared.kind !== PREPARED_KIND) {
    throw new Error('profilePrepare() expects a prepared text handle')
  }

  return {
    engineProfile: prepared.measurementMetadata.engineProfile,
    domCalibrationUsed: prepared.measurementMetadata.domCalibrationUsed,
    correctionApplied: prepared.measurementMetadata.correctionApplied,
    chunkCount: prepared.chunks.length,
    segmentCount: prepared.segments.length,
    unitCount: prepared.units.length,
    bidiLevels: prepared.segLevels.slice()
  }
}

export default {
  prepareText,
  prepareRichText,
  layout,
  layoutWithLines,
  layoutNextLine,
  walkLineRanges,
  materializeLineRange,
  profilePrepare
}
