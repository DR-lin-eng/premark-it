import { assert } from 'chai'
import markdownit from '../index.mjs'

describe('prepare extension', function () {
  it('reuses tokens for repeated parse and render calls', function () {
    const md = markdownit()
    const env = {}
    const prepared = md.prepare('# Hello\n\nThis is **strong**.', env)

    const parsed = md.parse(prepared)

    assert.strictEqual(parsed, prepared.tokens)
    assert.strictEqual(
      md.render(prepared),
      '<h1>Hello</h1>\n<p>This is <strong>strong</strong>.</p>\n'
    )
    assert.strictEqual(prepared.env, env)
  })

  it('keeps the standard parse input validation for non-string values', function () {
    const md = markdownit()

    assert.throws(function () {
      md.prepare(null)
    }, /Input data should be a String/)
  })
})
