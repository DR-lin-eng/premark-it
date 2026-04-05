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
    this.style = {
      setProperty: (name, value) => {
        const current = this.attributes.style ? `${this.attributes.style}; ` : ''
        const filtered = current
          .split(';')
          .map((entry) => entry.trim())
          .filter(Boolean)
          .filter((entry) => !entry.startsWith(`${name}:`))
        filtered.push(`${name}: ${value}`)
        this.attributes.style = filtered.join('; ')
      }
    }
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

  dispatch (type, extra = {}) {
    for (const fn of this.listeners[type] || []) {
      fn({ target: this, ...extra })
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
  const templateSelect = register('#template-select', new StubNode({ id: 'template-select', tag: 'select' }))
  templateSelect.value = 'demo'
  templateSelect.options = [new StubNode({ tag: 'option' }), new StubNode({ tag: 'option' }), new StubNode({ tag: 'option' })]
  const layoutBalance = register('#layout-balance', new StubNode({ id: 'layout-balance', tag: 'input' }))
  layoutBalance.value = '54'
  register('#layout-balance-value', new StubNode({ id: 'layout-balance-value', tag: 'strong' }))

  register('#html', Object.assign(new StubNode({ id: 'html', tag: 'input' }), { checked: false }))
  register('#linkify', Object.assign(new StubNode({ id: 'linkify', tag: 'input' }), { checked: true }))
  register('#typographer', Object.assign(new StubNode({ id: 'typographer', tag: 'input' }), { checked: true }))
  register('#breaks', Object.assign(new StubNode({ id: 'breaks', tag: 'input' }), { checked: false }))
  register('#xhtmlOut', Object.assign(new StubNode({ id: 'xhtmlOut', tag: 'input' }), { checked: false }))

  const input = register('#markdown-input', new StubNode({ id: 'markdown-input', tag: 'textarea' }))
  const workspace = register('.workspace', new StubNode({ className: 'workspace' }))
  register('.output-panel', new StubNode({ className: 'output-panel panel' }))
  const handle = register('#workspace-handle', new StubNode({ id: 'workspace-handle' }))
  handle.setPointerCapture = function () {}
  const preview = register('#preview-view', new StubNode({ id: 'preview-view' }))
  register('#html-view', new StubNode({ id: 'html-view', tag: 'pre' }))
  register('#tokens-view', new StubNode({ id: 'tokens-view', tag: 'pre' }))
  register('#stats-strip', new StubNode({ id: 'stats-strip' }))
  register('#copy-html', new StubNode({ id: 'copy-html', tag: 'button' }))
  register('#mode-badge', new StubNode({ id: 'mode-badge', tag: 'span' }))
  register('#template-badge', new StubNode({ id: 'template-badge', tag: 'span' }))
  register('#view-badge', new StubNode({ id: 'view-badge', tag: 'span' }))
  register('#presentation-mode-badge', new StubNode({ id: 'presentation-mode-badge', tag: 'span' }))
  register('#presentation-template-badge', new StubNode({ id: 'presentation-template-badge', tag: 'span' }))
  register('#presentation-view-badge', new StubNode({ id: 'presentation-view-badge', tag: 'span' }))
  register('.presentation-toolbar-label', new StubNode({ className: 'presentation-toolbar-label', tag: 'span' }))
  register('#present-toolbar-exit', new StubNode({ id: 'present-toolbar-exit', tag: 'button' }))
  register('#output-summary', new StubNode({ id: 'output-summary', tag: 'p' }))
  register('#layout-status', new StubNode({ id: 'layout-status' }))
  register('#copy-present-link', new StubNode({ id: 'copy-present-link', tag: 'button' }))
  register('#present-toggle', new StubNode({ id: 'present-toggle', tag: 'button' }))
  register('#copy-status', new StubNode({ id: 'copy-status' }))
  register('#reset-sample', new StubNode({ id: 'reset-sample', tag: 'button' }))
  register('#view-caption', new StubNode({ id: 'view-caption', tag: 'p' }))
  register('#editor-hint-body', new StubNode({ id: 'editor-hint-body', tag: 'p' }))
  register('.editor-hint-kicker', new StubNode({ className: 'editor-hint-kicker', tag: 'p' }))
  register('#editor-mode-chip', new StubNode({ id: 'editor-mode-chip', tag: 'span' }))
  register('#editor-template-chip', new StubNode({ id: 'editor-template-chip', tag: 'span' }))
  const tablist = register('.tablist', new StubNode({ className: 'tablist' }))
  const templateButtons = [
    new StubNode({ dataset: { templateButton: 'demo' }, className: 'template-card is-active', tag: 'button' }),
    new StubNode({ dataset: { templateButton: 'article' }, className: 'template-card', tag: 'button' }),
    new StubNode({ dataset: { templateButton: 'docs' }, className: 'template-card', tag: 'button' })
  ]

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
    'templateLabel',
    'layoutBalanceLabel',
    'heroPills.prepare',
    'heroPills.dynamic',
    'heroPills.i18n',
    'templateCards.demo.kicker',
    'templateCards.demo.title',
    'templateCards.demo.body',
    'templateCards.article.kicker',
    'templateCards.article.title',
    'templateCards.article.body',
    'templateCards.docs.kicker',
    'templateCards.docs.title',
    'templateCards.docs.body',
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
    body: new StubNode({ tag: 'body' }),
    title: '',
    querySelector (selector) {
      return selectors.get(selector) || null
    },
    querySelectorAll (selector) {
      if (selector === '[data-i18n]') return dataI18nNodes
      if (selector === '[data-i18n-html]') return dataI18nHtmlNodes
      if (selector === '.tab-button') return tabButtons
      if (selector === '[data-template-button]') return templateButtons
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
      location: {
        href: 'https://example.com/demo',
        search: ''
      },
      history: {
        replaceState () {}
      },
      requestAnimationFrame (callback) {
        return setTimeout(() => callback(Date.now()), 0)
      },
      cancelAnimationFrame (id) {
        clearTimeout(id)
      },
      addEventListener () {}
    }
  })

  Object.defineProperty(globalThis, 'requestAnimationFrame', {
    configurable: true,
    value: globalThis.window.requestAnimationFrame
  })

  Object.defineProperty(globalThis, 'cancelAnimationFrame', {
    configurable: true,
    value: globalThis.window.cancelAnimationFrame
  })

  Object.defineProperty(globalThis, 'requestIdleCallback', {
    configurable: true,
    value: (callback) => setTimeout(() => callback({ didTimeout: false, timeRemaining: () => 0 }), 0)
  })

  Object.defineProperty(globalThis, 'cancelIdleCallback', {
    configurable: true,
    value: (id) => clearTimeout(id)
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

  globalThis.document.documentElement.requestFullscreen = async function () {}
  globalThis.document.exitFullscreen = async function () {}
  globalThis.document.fullscreenElement = null

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
    templateSelect,
    layoutBalance,
    input,
    preview,
    handle,
    workspace,
    tablist,
    templateButtons,
    dataI18nNodes,
    body: globalThis.document.body,
    presentToggle: selectors.get('#present-toggle')
  }
}

describe('Demo i18n and layout', function () {
  it('switches the demo UI and sample markdown to Simplified Chinese', async function () {
    const env = createEnvironment()
    const moduleUrl = pathToFileURL(path.resolve('demo/main.js')).href + `?test=${Date.now()}`

    await import(moduleUrl)

    const inputTitle = env.dataI18nNodes.find((node) => node.dataset.i18n === 'inputTitle')
    const layoutLabel = env.dataI18nNodes.find((node) => node.dataset.i18n === 'layoutLabel')
    const templateLabel = env.dataI18nNodes.find((node) => node.dataset.i18n === 'templateLabel')
    assert.strictEqual(inputTitle.textContent, 'Markdown Source')
    assert.strictEqual(layoutLabel.textContent, 'Layout')
    assert.strictEqual(templateLabel.textContent, 'Template')
    assert.include(env.input.value, '# Premark-It Demo')

    env.locale.value = 'zh-CN'
    env.locale.dispatch('change')

    assert.strictEqual(inputTitle.textContent, 'Markdown 源文')
    assert.strictEqual(layoutLabel.textContent, '布局')
    assert.strictEqual(templateLabel.textContent, '模板')
    assert.strictEqual(globalThis.document.documentElement.lang, 'zh-CN')
    assert.strictEqual(env.tablist.attributes['aria-label'], '输出视图')
    assert.include(env.input.value, '# Premark-It 演示')
    assert.strictEqual(env.meta.attributes.content, '一个运行在 GitHub Pages 上的演示页，用于展示这版完全兼容 markdown-it 的重写实现和额外的 prepare() 缓存层。')
    assert.strictEqual(env.presentToggle.textContent, '全屏预览')
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
    assert.include(env.preview.innerHTML, 'stage-item')

    env.layoutBalance.value = '62'
    env.layoutBalance.dispatch('change')
    await new Promise((resolve) => setTimeout(resolve, 0))

    assert.include(env.workspace.attributes.style, '--output-fr: 0.620fr')
    env.templateSelect.value = 'docs'
    env.templateSelect.dispatch('change')
    await new Promise((resolve) => setTimeout(resolve, 0))
    assert.include(env.input.value, 'Premark-It Quickstart')
    assert.include(env.templateButtons[2].className, 'is-active')
    env.handle.dispatch('keydown', { key: 'ArrowRight' })
    await new Promise((resolve) => setTimeout(resolve, 0))
    assert.include(env.workspace.attributes.style, '--output-fr: 0.650fr')

    env.presentToggle.dispatch('click')
    await new Promise((resolve) => setTimeout(resolve, 0))
    assert.include(env.body.className, 'presentation-mode')
  })
})
