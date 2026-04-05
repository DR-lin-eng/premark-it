import { assert } from 'chai'

function installDocumentStub() {
  const originalDocument = globalThis.document
  const originalNavigator = globalThis.navigator

  const bodyChildren = []

  const document = {
    body: {
      appendChild(node) {
        bodyChildren.push(node)
      },
      removeChild(node) {
        const index = bodyChildren.indexOf(node)
        if (index >= 0) bodyChildren.splice(index, 1)
      }
    },
    createElement(tag) {
      if (tag === 'canvas') {
        return {
          getContext() {
            return {
              font: '',
              measureText(text) {
                return { width: Array.from(String(text)).length * 8 }
              }
            }
          }
        }
      }

      return {
        style: {},
        textContent: '',
        getBoundingClientRect() {
          return { width: Array.from(String(this.textContent)).length * 8 }
        }
      }
    }
  }

  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: document
  })

  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36'
    }
  })

  return () => {
    if (originalDocument === undefined) {
      delete globalThis.document
    } else {
      Object.defineProperty(globalThis, 'document', {
        configurable: true,
        value: originalDocument
      })
    }

    if (originalNavigator === undefined) {
      delete globalThis.navigator
    } else {
      Object.defineProperty(globalThis, 'navigator', {
        configurable: true,
        value: originalNavigator
      })
    }
  }
}

describe('prelayout experimental API', function () {
  let restoreEnvironment

  beforeEach(function () {
    restoreEnvironment = installDocumentStub()
  })

  afterEach(function () {
    restoreEnvironment?.()
  })

  function setUserAgent(userAgent) {
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: { userAgent }
    })
  }

  it('prepares width-independent IR and lays out text at different widths', async function () {
    const {
      prepareText,
      layout,
      layoutWithLines,
      profilePrepare
    } = await import(`../prelayout/index.mjs?test=${Date.now()}`)

    const prepared = prepareText(
      'Editorial layout should stay stable while resize work remains arithmetic only.',
      {
        fontFamily: 'Georgia, serif',
        fontSize: 18,
        lineHeight: 30
      }
    )

    assert.strictEqual(prepared.kind, 'premark-prelayout-prepared-v1')
    assert.isAbove(prepared.units.length, 10)
    assert.lengthOf(prepared.widths, prepared.units.length)
    assert.lengthOf(prepared.fitAdvances, prepared.units.length)
    assert.lengthOf(prepared.paintAdvances, prepared.units.length)
    assert.lengthOf(prepared.breakKinds, prepared.units.length)
    assert.lengthOf(prepared.breakablePrefixWidths, prepared.units.length)

    const narrow = layout(prepared, 140)
    const wide = layoutWithLines(prepared, 320)
    const profile = profilePrepare(prepared)

    assert.isAbove(narrow.lineCount, wide.lineCount)
    assert.strictEqual(wide.height, wide.lines.length * 30)
    assert.strictEqual(profile.engineProfile, 'chromium')
    assert.isFalse(profile.correctionApplied)
  })

  it('materializes rich text spans with bidi metadata and inline marks', async function () {
    const {
      prepareRichText,
      layoutWithLines
    } = await import(`../prelayout/index.mjs?test=${Date.now()}-rich`)

    const prepared = prepareRichText(
      [
        { text: 'Bold intro', strong: true },
        { text: ' then a link ', href: 'https://example.com' },
        { text: 'مرحبا', href: 'https://example.com' }
      ],
      {
        fontFamily: 'Georgia, serif',
        fontSize: 18,
        lineHeight: 30
      }
    )

    const result = layoutWithLines(prepared, 420)

    assert.isAtLeast(result.lines.length, 1)
    assert.isTrue(prepared.segLevels.includes(1))
    assert.strictEqual(result.lines[0].spans[0].segment.strong, true)
    assert.strictEqual(result.lines[0].spans[1].segment.href, 'https://example.com')
    assert.strictEqual(result.lines[0].spans[result.lines[0].spans.length - 1].bidiLevel, 1)
  })

  it('uses soft hyphen break opportunities when width gets tight', async function () {
    const {
      prepareText,
      layoutNextLine
    } = await import(`../prelayout/index.mjs?test=${Date.now()}-hyphen`)

    const prepared = prepareText('incredi\u00adble instrumentation', {
      fontFamily: 'Georgia, serif',
      fontSize: 18,
      lineHeight: 30
    })

    const first = layoutNextLine(prepared, { index: 0, y: 0, lineNumber: 0 }, 56)

    assert.isNotNull(first)
    assert.isTrue(first.line.appendHyphen)
    assert.include(first.line.text, '-')
  })

  it('classifies url-like and numeric runs as stable units', async function () {
    const {
      prepareText
    } = await import(`../prelayout/index.mjs?test=${Date.now()}-runs`)

    const prepared = prepareText(
      'Visit https://github.com/chenglou/pretext?id=1, then compare 2026/04/05 against 3.1415.',
      {
        fontFamily: 'Georgia, serif',
        fontSize: 18,
        lineHeight: 30
      }
    )

    const urlUnit = prepared.units.find((unit) => unit.analysisKind === 'url')
    const numericUnits = prepared.units.filter((unit) => unit.analysisKind === 'numeric')

    assert.exists(urlUnit)
    assert.strictEqual(urlUnit.text, 'https://github.com/chenglou/pretext?id=1')
    assert.includeMembers(numericUnits.map((unit) => unit.text), ['2026/04/05', '3.1415'])
  })

  it('keeps mixed script and punctuation metadata on prepared units', async function () {
    const {
      prepareText
    } = await import(`../prelayout/index.mjs?test=${Date.now()}-mixed`)

    const prepared = prepareText(
      '中文 English，“quoted” مرحبا',
      {
        fontFamily: 'Georgia, serif',
        fontSize: 18,
        lineHeight: 30
      }
    )

    assert.isTrue(prepared.units.some((unit) => unit.analysisKind === 'cjk'))
    assert.isTrue(prepared.units.some((unit) => unit.analysisKind === 'word'))
    assert.isTrue(prepared.units.some((unit) => unit.analysisKind === 'openingPunct'))
    assert.isTrue(prepared.units.some((unit) => unit.analysisKind === 'closingPunct'))
    assert.isTrue(prepared.units.some((unit) => unit.bidiLevel === 1))
  })

  it('records line-end fit and paint advances for breakable positions', async function () {
    const {
      prepareText
    } = await import(`../prelayout/index.mjs?test=${Date.now()}-line-end`)

    const prepared = prepareText('alpha beta\u00adgamma', {
      fontFamily: 'Georgia, serif',
      fontSize: 18,
      lineHeight: 30
    })

    const breakableIndexes = prepared.breakKinds
      .map((kind, index) => [kind, index])
      .filter(([kind]) => kind !== 'none')
      .map(([, index]) => index)

    assert.isAtLeast(breakableIndexes.length, 2)
    breakableIndexes.forEach((index) => {
      assert.isNotNull(prepared.lineEndFitAdvances[index])
      assert.isNotNull(prepared.lineEndPaintAdvances[index])
    })
  })

  it('keeps opening and closing punctuation attached to the quoted run', async function () {
    const {
      prepareText,
      layoutNextLine
    } = await import(`../prelayout/index.mjs?test=${Date.now()}-quotes`)

    const prepared = prepareText('Hello “world” again', {
      fontFamily: 'Georgia, serif',
      fontSize: 18,
      lineHeight: 30
    })

    const first = layoutNextLine(prepared, { index: 0, y: 0, lineNumber: 0 }, 56)
    const second = layoutNextLine(prepared, first.nextCursor, 80)

    assert.strictEqual(first.line.text.trim(), 'Hello')
    assert.include(second.line.text, '“world”')
  })

  it('honors keepAll for continuous CJK text', async function () {
    const {
      prepareText
    } = await import(`../prelayout/index.mjs?test=${Date.now()}-keep-all`)

    const source = '这是一个连续中文段落用于测试断行行为'
    const defaultPrepared = prepareText(source, {
      fontFamily: 'Georgia, serif',
      fontSize: 18,
      lineHeight: 30
    })
    const keepAllPrepared = prepareText(source, {
      fontFamily: 'Georgia, serif',
      fontSize: 18,
      lineHeight: 30,
      keepAll: true
    })

    const defaultBreaks = defaultPrepared.breakKinds.filter((kind) => kind !== 'none').length
    const keepAllBreaks = keepAllPrepared.breakKinds.filter((kind) => kind !== 'none').length

    assert.isAbove(defaultBreaks, keepAllBreaks)
  })

  it('preserves spaces and tabs under pre-wrap', async function () {
    const {
      prepareText,
      layoutWithLines
    } = await import(`../prelayout/index.mjs?test=${Date.now()}-pre-wrap`)

    const prepared = prepareText('alpha    beta\tgamma', {
      fontFamily: 'Georgia, serif',
      fontSize: 18,
      lineHeight: 30,
      whiteSpace: 'pre-wrap',
      tabSize: 2
    })

    const rendered = layoutWithLines(prepared, 400)

    assert.include(rendered.lines[0].text, 'alpha    beta')
    assert.include(rendered.lines[0].text, '  gamma')
  })

  it('prefers early soft hyphen breaks on firefox-like profiles', async function () {
    setUserAgent('Mozilla/5.0 Firefox/124.0')
    const {
      prepareText,
      layoutNextLine
    } = await import(`../prelayout/index.mjs?test=${Date.now()}-firefox-soft`)

    const prepared = prepareText('electro\u00admagnetic fields travel', {
      fontFamily: 'Georgia, serif',
      fontSize: 18,
      lineHeight: 30
    })

    const first = layoutNextLine(prepared, { index: 0, y: 0, lineNumber: 0 }, 88)

    assert.isTrue(first.line.appendHyphen)
    assert.include(first.line.text, '-')
    assert.strictEqual(prepared.engineProfile.id, 'firefox')
  })
})
