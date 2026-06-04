// Génère public/icon-192.png et public/icon-512.png : ballon de foot vert CDM26.
import { Resvg } from '@resvg/resvg-js'
import { writeFileSync, mkdirSync } from 'node:fs'

mkdirSync('public', { recursive: true })

const S = 512
const cx = 256, cy = 222, R = 132
const GREEN = '#15803d', DARK = '#0f5c2e', BLACK = '#101418', WHITE = '#ffffff'

function pentagon(ox, oy, r, rotDeg = -90) {
  const pts = []
  for (let i = 0; i < 5; i++) {
    const a = ((rotDeg + i * 72) * Math.PI) / 180
    pts.push([ox + r * Math.cos(a), oy + r * Math.sin(a)])
  }
  return pts
}
const toPath = (pts) => 'M' + pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' L') + ' Z'

const center = pentagon(cx, cy, 46)

let seams = ''
for (const [x, y] of center) {
  const dx = x - cx, dy = y - cy
  const len = Math.hypot(dx, dy)
  const ex = cx + (dx / len) * R, ey = cy + (dy / len) * R
  seams += `<line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${ex.toFixed(1)}" y2="${ey.toFixed(1)}" stroke="${DARK}" stroke-width="6"/>`
}

let outer = ''
for (let i = 0; i < 5; i++) {
  const ang = -90 + 36 + i * 72
  const a = (ang * Math.PI) / 180
  const ox = cx + Math.cos(a) * 104, oy = cy + Math.sin(a) * 104
  outer += `<path d="${toPath(pentagon(ox, oy, 26, ang + 180))}" fill="${BLACK}"/>`
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
  <rect width="${S}" height="${S}" rx="96" fill="${GREEN}"/>
  <circle cx="${cx}" cy="${cy}" r="${R}" fill="${WHITE}" stroke="${DARK}" stroke-width="6"/>
  ${seams}
  ${outer}
  <path d="${toPath(center)}" fill="${BLACK}"/>
  <text x="${cx}" y="440" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="66" font-weight="800" fill="${WHITE}">CDM26</text>
</svg>`

for (const size of [192, 512]) {
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng()
  writeFileSync(`public/icon-${size}.png`, png)
  console.log(`écrit public/icon-${size}.png (${png.length} octets)`)
}

// favicon (PNG 48px nommé .ico — accepté par les navigateurs modernes)
const fav = new Resvg(svg, { fitTo: { mode: 'width', value: 48 } }).render().asPng()
writeFileSync('public/favicon.ico', fav)
console.log(`écrit public/favicon.ico (${fav.length} octets)`)
