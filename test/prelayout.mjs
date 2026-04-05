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
})
