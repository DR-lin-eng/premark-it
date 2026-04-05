import { build } from 'esbuild'
import { mkdir, readFile, rm, writeFile, copyFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const demoDir = path.join(rootDir, 'demo')
const outDir = path.join(rootDir, 'demo-dist')
const assetsDir = path.join(outDir, 'assets')

const packageJson = JSON.parse(
  await readFile(path.join(rootDir, 'package.json'), 'utf8')
)

await rm(outDir, { recursive: true, force: true })
await mkdir(assetsDir, { recursive: true })

await build({
  entryPoints: [path.join(demoDir, 'main.js')],
  outfile: path.join(assetsDir, 'demo.js'),
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: ['es2022'],
  sourcemap: false,
  minify: true
})

await build({
  entryPoints: [path.join(demoDir, 'accuracy.js')],
  outfile: path.join(assetsDir, 'accuracy.js'),
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: ['es2022'],
  sourcemap: false,
  minify: true
})

await build({
  entryPoints: [path.join(demoDir, 'browser-entry.js')],
  outfile: path.join(assetsDir, 'premark-it-editorial.js'),
  bundle: true,
  format: 'iife',
  globalName: 'PremarkItEditorial',
  platform: 'browser',
  target: ['es2022'],
  sourcemap: false,
  minify: true
})

await build({
  entryPoints: [path.join(demoDir, 'editorial-engine.js')],
  outfile: path.join(assetsDir, 'editorial-engine.js'),
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: ['es2022'],
  sourcemap: false,
  minify: true
})

const htmlTemplate = await readFile(path.join(demoDir, 'index.html'), 'utf8')
const accuracyTemplate = await readFile(path.join(demoDir, 'accuracy.html'), 'utf8')
const editorialEngineTemplate = await readFile(path.join(demoDir, 'editorial-engine.html'), 'utf8')

await writeFile(
  path.join(outDir, 'index.html'),
  htmlTemplate.replaceAll('__VERSION__', packageJson.version)
)

await writeFile(
  path.join(outDir, 'accuracy.html'),
  accuracyTemplate.replaceAll('__VERSION__', packageJson.version)
)

await writeFile(
  path.join(outDir, 'editorial-engine.html'),
  editorialEngineTemplate.replaceAll('__VERSION__', packageJson.version)
)

await copyFile(
  path.join(demoDir, 'styles.css'),
  path.join(outDir, 'styles.css')
)

await copyFile(
  path.join(rootDir, 'test', 'test.png'),
  path.join(assetsDir, 'test.png')
)
