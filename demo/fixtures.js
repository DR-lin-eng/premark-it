export const ACCURACY_FIXTURES = [
  {
    id: 'english-editorial',
    title: 'English longform',
    locale: 'en',
    styleKey: 'body',
    widths: [360, 520, 760],
    text: 'Editorial layout should stay stable while resize work remains arithmetic only. The point is not to fake a pretty card stack, but to preserve readable rhythm while the browser font engine stays the source of truth during prepare time.'
  },
  {
    id: 'cjk-continuous',
    title: 'Chinese continuous text',
    locale: 'zh-CN',
    styleKey: 'body',
    widths: [320, 460, 680],
    text: '这是一个用于测试连续中文排版的段落。它应该能够在不同宽度下保持稳定的断行和高度估算，同时避免重新读取同步 DOM 布局信息。'
  },
  {
    id: 'mixed-emoji',
    title: 'Mixed scripts + emoji',
    locale: 'en',
    styleKey: 'body',
    widths: [340, 500, 720],
    text: 'Prelayout should handle emoji 😀🙂🚀, numbers 2026/04/05, URLs like https://github.com/chenglou/pretext, and mixed text such as 中文 with English inside the same measurement pass.'
  },
  {
    id: 'rtl-inline',
    title: 'RTL / bidi sample',
    locale: 'en',
    styleKey: 'body',
    widths: [340, 520, 720],
    text: 'Inline bidi should remain stable when English wraps next to Arabic مثل هذا المثال داخل السطر نفسه without forcing DOM remeasurement on every resize.'
  },
  {
    id: 'soft-hyphen',
    title: 'Soft hyphen + preserved spaces',
    locale: 'en',
    styleKey: 'body',
    widths: [300, 420, 620],
    text: 'Incredi\u00adble typography should support soft hyphen breaks, and pre-wrap text should preserve    intentional spacing when the style asks for it.'
  }
]
