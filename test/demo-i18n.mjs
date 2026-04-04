import { assert } from 'chai'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

class StubNode {
  constructor ({ id = null, className = '', dataset = {}, tag = 'div', textContent = '', innerHTML = '' } = {}) {
    this.id = id
    this.className = className
    this.dataset = dataset
    this.tagName = tag.toUpperCase()
    this.textContent = textContent
    this.innerHTML = innerHTML || textContent
    this.value = ''
    this.checked = false
    this.listeners = {}
    this.attributes = {}
    this.options = []
    this.classList = {
      toggle: (name, active) => {
        const classes = new Set(this.className.split(/\s+/).filter(Boolean))
        if (active) classes.add(name)
        else classes.delete(name)
        this.className = Array.from(classes).join(' ')
      }
    }
  }

  addEventListener (type, fn) {
    ;(this.listeners[type] ||= []).push(fn)
  }

  setAttribute (name, value) {
    this.attributes[name] = value
  }

  dispatch (type) {
    for (const fn of this.listeners[type] || []) {
      fn({ target: this })
    }
  }
}

function createEnvironment () {
  const selectors = new Map()
  const dataI18nNodes = []
  const dataI18nHtmlNodes = []
  const tabButtons = []
  const panels = []

  function register (selector, node) {
    selectors.set(selector, node)
    return node
  }

  function translatableTextNode (key, text = key) {
    const node = new StubNode({ dataset: { i18n: key }, textContent: text })
    dataI18nNodes.push(node)
    return node
  }

  function translatableHtmlNode (key, html = key) {
    const node = new StubNode({ dataset: { i18nHtml: key }, innerHTML: html, textContent: html })
    dataI18nHtmlNodes.push(node)
    return node
  }

  const meta = register('meta[name="description"]', new StubNode())
  const locale = register('#locale-select', new StubNode({ id: 'locale-select', tag: 'select' }))
  locale.options = [new StubNode({ tag: 'option' }), new StubNode({ tag: 'option' })]

  const preset = register('#preset', new StubNode({ id: 'preset', tag: 'select' }))
  preset.value = 'default'
  const layoutMode = register('#layout-mode', new StubNode({ id: 'layout-mode', tag: 'select' }))
  layoutMode.value = 'classic'
  layoutMode.options = [new StubNode({ tag: 'option' }), new StubNode({ tag: 'option' })]

  register('#html', Object.assign(new StubNode({ id: 'html', tag: 'input' }), { checked: false }))
  register('#linkify', Object.assign(new StubNode({ id: 'linkify', tag: 'input' }), { checked: true }))
  register('#typographer', Object.assign(new StubNode({ id: 'typographer', tag: 'input' }), { checked: true }))
  register('#breaks', Object.assign(new StubNode({ id: 'breaks', tag: 'input' }), { checked: false }))
  register('#xhtmlOut', Object.assign(new StubNode({ id: 'xhtmlOut', tag: 'input' }), { checked: false }))

  const input = register('#markdown-input', new StubNode({ id: 'markdown-input', tag: 'textarea' }))
  const workspace = register('.workspace', new StubNode({ className: 'workspace' }))
  const preview = register('#preview-view', new StubNode({ id: 'preview-view' }))
  register('#html-view', new StubNode({ id: 'html-view', tag: 'pre' }))
  register('#tokens-view', new StubNode({ id: 'tokens-view', tag: 'pre' }))
  register('#stats-strip', new StubNode({ id: 'stats-strip' }))
  register('#copy-html', new StubNode({ id: 'copy-html', tag: 'button' }))
  register('#copy-status', new StubNode({ id: 'copy-status' }))
  register('#reset-sample', new StubNode({ id: 'reset-sample', tag: 'button' }))
  const tablist = register('.tablist', new StubNode({ className: 'tablist' }))

  for (const key of [
    'eyebrow',
    'heroTitle',
    'localeLabel',
    'packageVersionLabel',
    'modesLabel',
    'modeSummary',
    'inputKicker',
    'inputTitle',
    'resetSample',
    'presetLabel',
    'layoutLabel',
    'options.html',
    'options.linkify',
    'options.typographer',
    'options.breaks',
    'options.xhtmlOut',
    'outputKicker',
    'outputTitle',
    'tabs.preview',
    'tabs.html',
    'tabs.tokens',
    'copyHtml'
  ]) {
    translatableTextNode(key)
  }

  translatableHtmlNode('heroText')

  for (const name of ['preview', 'html', 'tokens']) {
    tabButtons.push(new StubNode({
      className: name === 'preview' ? 'tab-button is-active' : 'tab-button',
      dataset: { view: name },
      tag: 'button'
    }))
    panels.push(new StubNode({ dataset: { viewPanel: name } }))
  }

  globalThis.document = {
    documentElement: new StubNode({ tag: 'html' }),
    title: '',
    querySelector (selector) {
      return selectors.get(selector) || null
    },
    querySelectorAll (selector) {
      if (selector === '[data-i18n]') return dataI18nNodes
      if (selector === '[data-i18n-html]') return dataI18nHtmlNodes
      if (selector === '.tab-button') return tabButtons
      if (selector === '[data-view-panel]') return panels
      return []
    },
    createElement () {
      return {
        getContext () {
          return {
            font: '',
            measureText (text) {
              return { width: String(text).length * 8 }
            }
          }
        }
      }
    }
  }

  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: {
      languages: ['en-US'],
      language: 'en-US',
      clipboard: {
        async writeText () {}
      }
    }
  })

  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      innerWidth: 1440,
      innerHeight: 900,
      addEventListener () {}
    }
  })

  Object.defineProperty(globalThis, 'Image', {
    configurable: true,
    value: class {
      set src (_value) {
        this.naturalWidth = 1200
        this.naturalHeight = 800
        queueMicrotask(() => this.onload?.())
      }
    }
  })

  const localStore = new Map()
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem (key) {
        return localStore.has(key) ? localStore.get(key) : null
      },
      setItem (key, value) {
        localStore.set(key, value)
      }
    }
  })

  return {
    meta,
    locale,
    layoutMode,
    input,
    preview,
    workspace,
    tablist,
    dataI18nNodes
  }
}

describe('Demo i18n and layout', function () {
  it('switches the demo UI and sample markdown to Simplified Chinese', async function () {
    const env = createEnvironment()
    const moduleUrl = pathToFileURL(path.resolve('demo/main.js')).href + `?test=${Date.now()}`

    await import(moduleUrl)

    const inputTitle = env.dataI18nNodes.find((node) => node.dataset.i18n === 'inputTitle')
    const layoutLabel = env.dataI18nNodes.find((node) => node.dataset.i18n === 'layoutLabel')
    assert.strictEqual(inputTitle.textContent, 'Markdown Source')
    assert.strictEqual(layoutLabel.textContent, 'Layout')
    assert.include(env.input.value, '# Premark-It Demo')

    env.locale.value = 'zh-CN'
    env.locale.dispatch('change')

    assert.strictEqual(inputTitle.textContent, 'Markdown 源文')
    assert.strictEqual(layoutLabel.textContent, '布局')
    assert.strictEqual(globalThis.document.documentElement.lang, 'zh-CN')
    assert.strictEqual(env.tablist.attributes['aria-label'], '输出视图')
    assert.include(env.input.value, '# Premark-It 演示')
    assert.strictEqual(env.meta.attributes.content, '一个运行在 GitHub Pages 上的演示页，用于展示这版完全兼容 markdown-it 的重写实现和额外的 prepare() 缓存层。')
  })

  it('enables dynamic layout mode in the workspace', async function () {
    const env = createEnvironment()
    const moduleUrl = pathToFileURL(path.resolve('demo/main.js')).href + `?test=${Date.now()}`

    await import(moduleUrl)

    env.layoutMode.value = 'dynamic'
    env.layoutMode.dispatch('change')
    await new Promise((resolve) => setTimeout(resolve, 0))

    assert.include(env.workspace.className, 'workspace-dynamic-mode')
    assert.include(env.preview.className, 'rendered-view-dynamic-mode')
    assert.include(env.preview.innerHTML, 'dynamic-stage')
  })
})
