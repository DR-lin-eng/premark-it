import { chromium, firefox, webkit } from 'playwright'
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const demoDistDir = path.join(rootDir, 'demo-dist')

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png'
}

function contentTypeFor(filePath) {
  return CONTENT_TYPES[path.extname(filePath)] || 'application/octet-stream'
}

function createStaticServer(root) {
  return http.createServer(async (req, res) => {
    try {
      const requestPath = req.url === '/' ? '/index.html' : req.url
      const normalized = path.normalize(decodeURIComponent(requestPath)).replace(/^(\.\.[/\\])+/, '')
      const filePath = path.join(root, normalized)
      const fileStat = await stat(filePath)

      if (!fileStat.isFile()) {
        res.writeHead(404)
        res.end('Not found')
        return
      }

      res.writeHead(200, { 'content-type': contentTypeFor(filePath) })
      createReadStream(filePath).pipe(res)
    } catch {
      res.writeHead(404)
      res.end('Not found')
    }
  })
}

async function run() {
  const server = createStaticServer(demoDistDir)
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address()
  const baseUrl = `http://127.0.0.1:${address.port}`
  const browsers = [
    ['chromium', chromium],
    ['firefox', firefox],
    ['webkit', webkit]
  ]

  let failureCount = 0
  const failures = []

  try {
    for (const [name, browserType] of browsers) {
      let browser
      try {
        browser = await browserType.launch()
      } catch (error) {
        failures.push(`${name}: ${error.message}`)
        failureCount += 1
        continue
      }

      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
      const page = await context.newPage()
      const consoleMessages = []
      const pageErrors = []

      page.on('console', (message) => {
        consoleMessages.push(`${message.type()}: ${message.text()}`)
      })

      page.on('pageerror', (error) => {
        pageErrors.push(error.message)
      })

      await page.addInitScript(() => {
        window.__rectReads = 0
        const original = Element.prototype.getBoundingClientRect
        Element.prototype.getBoundingClientRect = function (...args) {
          window.__rectReads += 1
          return original.apply(this, args)
        }
      })

      try {
        await page.goto(`${baseUrl}/accuracy.html`, { waitUntil: 'networkidle' })
        await page.waitForSelector('#accuracy-results tr')

        const accuracy = await page.evaluate(() => {
          return {
            rows: document.querySelectorAll('#accuracy-results tr').length,
            summary: document.querySelector('#accuracy-summary')?.textContent || ''
          }
        })

        if (accuracy.rows < 12) {
          throw new Error(`expected at least 12 accuracy rows, got ${accuracy.rows}`)
        }

        if (!accuracy.summary.includes('/')) {
          throw new Error('accuracy summary did not render')
        }

        await page.goto(`${baseUrl}/index.html`, { waitUntil: 'networkidle' })
        await page.selectOption('#layout-mode', 'dynamic')
        await page.waitForSelector('.dynamic-stage .stage-item')

        const rectReadsAfterPrepare = await page.evaluate(() => window.__rectReads)
        await page.setViewportSize({ width: 1200, height: 900 })
        await page.waitForTimeout(120)
        const rectReadsAfterResize = await page.evaluate(() => window.__rectReads)

        if (rectReadsAfterResize !== rectReadsAfterPrepare) {
          throw new Error(`resize triggered sync DOM reads (${rectReadsAfterPrepare} -> ${rectReadsAfterResize})`)
        }
      } catch (error) {
        const diagnostics = [
          pageErrors.length ? `pageerror: ${pageErrors.join(' | ')}` : '',
          consoleMessages.length ? `console: ${consoleMessages.join(' | ')}` : ''
        ]
          .filter(Boolean)
          .join('\n')
        failures.push(`${name}: ${error.message}${diagnostics ? `\n${diagnostics}` : ''}`)
        failureCount += 1
      } finally {
        await context.close()
        await browser.close()
      }
    }
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  }

  if (failureCount > 0) {
    throw new Error(`Browser accuracy tests failed:\n${failures.join('\n')}`)
  }

  console.log('browser accuracy smoke passed')
}

run().catch((error) => {
  console.error(error.stack || error.message)
  process.exitCode = 1
})
