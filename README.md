# Markdown-It Compatible Rewrite

This workspace now targets full `markdown-it` compatibility by using the official parser and test surface as the baseline, then adding a small Pretext-inspired extension on top.

## What is compatible

- Public constructor and preset behavior
- Core, block, inline, renderer, token, ruler, helpers, and utils APIs
- CommonMark and markdown-it fixture behavior covered by the official upstream tests copied into `test/`
- Plugin loading and rule enable/disable behavior

## Pretext-inspired addition

On top of standard `markdown-it`, this rewrite adds:

```js
const md = markdownit()
const prepared = md.prepare('# title')

const tokens = md.parse(prepared)
const html = md.render(prepared)
```

`prepare()` precomputes tokens once so repeated parse/render calls can reuse the same analysis result.

## GitHub demo

The repository now includes a browser demo in [`demo/index.html`](./demo/index.html) and a GitHub Pages workflow in [`.github/workflows/demo-pages.yml`](./.github/workflows/demo-pages.yml).

Once the repository is on GitHub and Pages is configured to deploy from GitHub Actions, pushes to `main` or `master` will:

- install dependencies
- run the full compatibility test suite
- build the demo into `demo-dist/`
- publish the demo to GitHub Pages

Build the demo locally with:

```bash
npm run build:demo
```

That produces a static site in `demo-dist/` which can be uploaded or previewed with any static file server.

## Run tests locally

```bash
npm install
npm test
```

## Run tests with Docker

```bash
docker build -t markdown-it-pretext-compatible .
docker run --rm markdown-it-pretext-compatible
```
