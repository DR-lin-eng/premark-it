import { assert } from 'chai'
import { computePreviewMetrics } from '../demo/dynamic-layout.js'

describe('Demo dynamic layout metrics', function () {
  it('computes a narrower preview width on desktop split layout', function () {
    const desktop = computePreviewMetrics(1440, 900)
    const mobile = computePreviewMetrics(720, 900)

    assert.isTrue(desktop.wide)
    assert.isFalse(mobile.wide)
    assert.isBelow(desktop.previewWidth, 700)
    assert.isAbove(mobile.previewWidth, 320)
  })
})
