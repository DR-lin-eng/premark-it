import { layout, prepareText, profilePrepare } from '../prelayout/index.mjs'
import { ACCURACY_FIXTURES } from './fixtures.js'

const STYLES = {
  body: {
    fontFamily: '"Source Serif 4", Georgia, serif',
    fontSize: 20,
    lineHeight: 34,
    fontWeight: 400
  }
}

const summaryNode = document.querySelector('#accuracy-summary')
const tableBody = document.querySelector('#accuracy-results')
const hiddenOracleRoot = document.querySelector('#oracle-root')

function measureDomOracle(text, style, width) {
  const node = document.createElement('div')
  node.textContent = text
  node.style.position = 'absolute'
  node.style.visibility = 'hidden'
  node.style.left = '-9999px'
  node.style.top = '0'
  node.style.width = `${width}px`
  node.style.whiteSpace = style.whiteSpace === 'pre-wrap' ? 'pre-wrap' : 'normal'
  node.style.fontFamily = style.fontFamily
  node.style.fontSize = `${style.fontSize}px`
  node.style.lineHeight = `${style.lineHeight}px`
  node.style.fontWeight = String(style.fontWeight)
  node.style.fontStyle = style.italic ? 'italic' : 'normal'
  node.style.letterSpacing = `${style.letterSpacing || 0}px`
  hiddenOracleRoot.appendChild(node)

  const rect = node.getBoundingClientRect()
  hiddenOracleRoot.removeChild(node)

  return {
    height: rect.height,
    lineCount: Math.max(1, Math.round(rect.height / style.lineHeight))
  }
}

function toneForDelta(delta) {
  if (delta === 0) return 'accuracy-good'
  if (delta === 1) return 'accuracy-warn'
  return 'accuracy-bad'
}

function renderRow(fixture, width, computed, oracle, prepareProfile) {
  const lineDelta = Math.abs(computed.lineCount - oracle.lineCount)
  const heightDelta = Math.round(Math.abs(computed.height - oracle.height))

  return `
    <tr>
      <td>${fixture.title}</td>
      <td>${width}px</td>
      <td><span class="accuracy-pill ${toneForDelta(lineDelta)}">${computed.lineCount}</span></td>
      <td>${oracle.lineCount}</td>
      <td><span class="accuracy-pill ${toneForDelta(heightDelta > 4 ? 2 : heightDelta > 1 ? 1 : 0)}">${Math.round(computed.height)}px</span></td>
      <td>${Math.round(oracle.height)}px</td>
      <td>${prepareProfile.engineProfile}</td>
      <td>${prepareProfile.correctionApplied ? 'yes' : 'no'}</td>
    </tr>
  `
}

function runFixtures() {
  let exactLineMatches = 0
  let totalCases = 0
  const rows = []

  for (const fixture of ACCURACY_FIXTURES) {
    const style = STYLES[fixture.styleKey]
    const prepared = prepareText(fixture.text, style, { locale: fixture.locale })
    const prepareProfile = profilePrepare(prepared)

    fixture.widths.forEach((width) => {
      const computed = layout(prepared, width)
      const oracle = measureDomOracle(fixture.text, style, width)
      if (computed.lineCount === oracle.lineCount) {
        exactLineMatches += 1
      }
      totalCases += 1
      rows.push(renderRow(fixture, width, computed, oracle, prepareProfile))
    })
  }

  summaryNode.innerHTML = `
    <strong>${exactLineMatches} / ${totalCases}</strong>
    cases match the DOM oracle on exact line count in this browser.
  `
  tableBody.innerHTML = rows.join('')
}

runFixtures()
