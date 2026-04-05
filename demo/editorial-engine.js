const CAPABILITIES = {
  'editorial-engine': {
    title: 'Editorial Engine',
    description: 'Continuous editorial flow with headings, rail figures, notes, code bands, and structured tables.',
    libraryCapability: 'editorial-engine',
    markdown: `# Premark-It Editorial Engine

This mode takes raw Markdown and turns it into an editorial spread directly in the browser.

> A note can live beside the narrative instead of interrupting it.

![Editorial sample](./assets/test.png)

## Why it matters

- Prepare once, then recompose cheaply on resize.
- Markdown stays author-friendly.
- The browser remains the measurement ground truth.

## Snapshot

| Element | Treatment |
| --- | --- |
| Heading | Strong display hierarchy |
| Body copy | Continuous flow |
| Figure | Rail or full-width |
| Code | Full-width band |
`
  },
  'dynamic-layout': {
    title: 'Dynamic Layout',
    description: 'A more stage-like spread with stronger rail behavior and bigger rhythm shifts as the viewport changes.',
    libraryCapability: 'dynamic-layout',
    markdown: `# Dynamic Layout

The same Markdown source can recompose into a different editorial spread as space changes.

> Resize the container and the narrative should rebalance instead of forcing a full DOM re-measure.

![Dynamic sample](./assets/test.png)

## Signals

- Narrative blocks should remain continuous
- Supplementary material should move to the rails
- Code and tables should keep structural clarity
`
  },
  'markdown-chat': {
    title: 'Markdown Chat',
    description: 'Alternating message bubbles rendered from Markdown, with links, emphasis, and code preserved.',
    libraryCapability: 'markdown-chat',
    markdown: `System: This conversation is rendered directly from Markdown.

User: Can we keep **inline emphasis**, links like https://openai.com, and short code like \`prepare()\`?

Assistant: Yes. We can also render fenced blocks.

\`\`\`js
const prepared = engine.md\`
# hello
\`
\`\`\`

User: Great, now make it feel like a native app bubble layout.`
  },
  'rich-text': {
    title: 'Rich Text',
    description: 'A compact inline presentation that mixes prose and chips for product-like annotation flows.',
    libraryCapability: 'rich-text',
    markdown: `Rich inline content can mix **bold guidance**, [documentation](https://github.com/chenglou/pretext), [[prepare()]], [[layoutNextLine()]], and [[DOM correction]] into one composable surface.`
  },
  'inline-flow': {
    title: 'Inline Flow',
    description: 'Inline prose and chip-like annotations flowing together as one measured line-wrapped surface.',
    libraryCapability: 'inline-flow',
    markdown: `Inline prose can wrap beside [[prepare()]], [[layoutNextLine()]], [[materializeLineRange()]], and [[DOM correction]] without falling back to hard-coded widths.`
  },
  bubbles: {
    title: 'Bubbles',
    description: 'Shrink-wrapped message bubbles measured from content, useful for quotes, comments, and compact reactions.',
    libraryCapability: 'bubbles',
    markdown: `A short bubble for a headline.

A slightly longer bubble that needs more width to stay readable.

One more bubble with emoji 😀🙂🚀 and mixed text 你好 world.

Compact measurement matters when the container gets narrow.`
  },
  masonry: {
    title: 'Masonry',
    description: 'Measured cards placed into columns by predicted height, using Markdown content as the source.',
    libraryCapability: 'masonry',
    markdown: `# Card One
Smaller summary content for the first card.

---

# Card Two
This card carries a longer body so the predicted height is noticeably taller and should fall into the shortest next column during placement.

---

# Card Three
- Structured content
- Still driven by Markdown
- Still measured before placement

---

# Card Four
\`\`\`js
console.log("masonry")
\`\`\`
`
  },
  accordion: {
    title: 'Accordion',
    description: 'Collapsible sections whose body size is informed by measured copy, not arbitrary fixed heights.',
    libraryCapability: 'accordion',
    markdown: `## Overview
Accordion sections should open with enough space for their measured content.

## Behavior
Use the browser text engine during preparation, then animate the already-known panel height.

## Notes
This is a good fit for docs, FAQs, and inline product explainers.`
  },
  justification: {
    title: 'Justification',
    description: 'A side-by-side comparison between native CSS paragraph layout and the measured greedy line walk.',
    libraryCapability: 'justification',
    markdown: `Justification showcases where browser-native paragraph layout and a measured line-walking engine can diverge. The point is not to replace everything the browser does, but to expose the shape of the prepared text and make layout decisions observable.`
  },
  ascii: {
    title: 'ASCII',
    description: 'A small typographic comparison between proportional and monospaced placement for the same input string.',
    libraryCapability: 'ascii',
    markdown: 'PREMARK 2026'
  },
  'line-break': {
    title: 'Line Break',
    description: 'Shows the same prepared text laid out at multiple widths so break decisions become visible.',
    libraryCapability: 'line-break',
    markdown: `Line breaking is where run analysis, width-independent prepared data, and browser profile preferences all become visible. URLs like https://github.com/chenglou/pretext should remain stable while smaller widths force earlier choices.`
  },
  'prepare-profile': {
    title: 'Prepare Profile',
    description: 'A lightweight inspector for the prepared text handle: engine profile, chunk count, unit count, and run kinds.',
    libraryCapability: 'prepare-profile',
    markdown: `Profile this markdown source for emoji 😀🙂🚀, mixed text 你好 world, and numbers like 2026/04/05 so the prepared handle exposes what was measured.`
  }
}

const elements = {
  capability: document.querySelector('#capability-select'),
  usageMode: document.querySelector('#usage-mode'),
  locale: document.querySelector('#engine-locale'),
  markdown: document.querySelector('#engine-markdown'),
  previewHost: document.querySelector('#engine-preview-host'),
  capabilityTitle: document.querySelector('#capability-title'),
  capabilityDescription: document.querySelector('#capability-description'),
  usageSummary: document.querySelector('#usage-summary'),
  usageCode: document.querySelector('#usage-code')
}

let controller = null

function currentCapability() {
  return CAPABILITIES[elements.capability.value]
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function renderUsage() {
  const capability = currentCapability()
  const markdownSource = elements.markdown.value
  const usageMode = elements.usageMode.value

  if (usageMode === 'custom-element') {
    elements.usageSummary.textContent = 'Wrap Markdown directly inside a custom element and let the browser script auto-upgrade it.'
    elements.usageCode.textContent = `<script src="./assets/premark-it-editorial.js"></script>

<premark-editorial
  capability="${capability.libraryCapability}"
  locale="${elements.locale.value}"
>
${markdownSource}
</premark-editorial>`
    return
  }

  const methodMap = {
    'editorial-engine': 'editorial',
    'dynamic-layout': 'dynamicLayout',
    'markdown-chat': 'chat',
    'rich-text': 'richText',
    'inline-flow': 'inlineFlow',
    bubbles: 'bubbles',
    masonry: 'masonry',
    accordion: 'accordion',
    justification: 'justification',
    ascii: 'ascii',
    'line-break': 'lineBreak',
    'prepare-profile': 'prepareProfile'
  }
  const convenienceMethod = methodMap[capability.libraryCapability] || 'render'
  elements.usageSummary.textContent = 'Use the global helper and the template-string wrapper for the lowest-code function-based integration.'
  elements.usageCode.textContent = `<div id="hero"></div>
<script src="./assets/premark-it-editorial.js"></script>
<script>
  PremarkItEditorial.${convenienceMethod}(
    '#hero',
    PremarkItEditorial.md\`
${markdownSource}
\`,
    { locale: '${elements.locale.value}' }
  )
</script>`
}

function renderPreview() {
  const capability = currentCapability()
  elements.capabilityTitle.textContent = capability.title
  elements.capabilityDescription.textContent = capability.description

  controller?.destroy?.()
  elements.previewHost.innerHTML = ''
  controller = window.PremarkItEditorial.render(
    elements.previewHost,
    elements.markdown.value,
    {
      capability: capability.libraryCapability,
      locale: elements.locale.value,
      useShadow: false
    }
  )
  renderUsage()
}

elements.capability.addEventListener('change', () => {
  const capability = currentCapability()
  elements.markdown.value = capability.markdown
  renderPreview()
})

elements.usageMode.addEventListener('change', renderUsage)
elements.locale.addEventListener('change', renderPreview)
elements.markdown.addEventListener('input', renderPreview)

elements.markdown.value = currentCapability().markdown
renderPreview()
