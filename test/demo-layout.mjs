import { assert } from 'chai'
import { computePreviewMetrics, diffSourceBlocks, splitMarkdownIntoSourceBlocks } from '../demo/dynamic-layout.js'

describe('Demo dynamic layout metrics', function () {
  it('computes a narrower preview width on desktop split layout', function () {
    const desktop = computePreviewMetrics(1440, 900)
    const mobile = computePreviewMetrics(720, 900)
    const narrowOutput = computePreviewMetrics(1440, 900, 0.35)
    const wideOutput = computePreviewMetrics(1440, 900, 0.65)

    assert.isTrue(desktop.wide)
    assert.isFalse(mobile.wide)
    assert.isBelow(desktop.previewWidth, 700)
    assert.isAbove(mobile.previewWidth, 320)
    assert.isBelow(narrowOutput.previewWidth, wideOutput.previewWidth)
  })

  it('accounts for workspace handle width in desktop dynamic layout calculations', function () {
    const balanced = computePreviewMetrics(1440, 900, 0.5)
    const slightlyWider = computePreviewMetrics(1440, 900, 0.52)

    assert.isBelow(balanced.previewWidth, 720)
    assert.isAbove(slightlyWider.previewWidth, balanced.previewWidth)
  })

  it('splits markdown source into reusable source blocks', function () {
    const blocks = splitMarkdownIntoSourceBlocks(`# Title

Paragraph text

> Quote
> line

\`\`\`js
console.log("x")
\`\`\`

| A | B |
| - | - |
| 1 | 2 |
`)

    assert.lengthOf(blocks, 5)
    assert.strictEqual(blocks[0], '# Title')
    assert.include(blocks[3], 'console.log("x")')
    assert.include(blocks[4], '| A | B |')
  })

  it('finds stable prefix and suffix ranges between source block versions', function () {
    const previousBlocks = ['# Title', 'Alpha', 'Beta', 'Gamma']
    const nextBlocks = ['# Title', 'Alpha', 'Beta updated', 'Gamma']
    const diff = diffSourceBlocks(previousBlocks, nextBlocks)

    assert.deepEqual(diff, {
      prefix: 2,
      suffix: 1,
      changedPrevious: 1,
      changedNext: 1
    })
  })
})
