// Génère public/icon-192.png et public/icon-512.png :
// trophée Coupe du Monde FIFA doré sur fond vert foncé (#1a6b3c) + "CDM26".
import sharp from 'sharp'
import { mkdirSync } from 'node:fs'

mkdirSync('public', { recursive: true })

const GREEN = '#1a6b3c'

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFEFAE"/>
      <stop offset="0.45" stop-color="#F4C842"/>
      <stop offset="1" stop-color="#C28A14"/>
    </linearGradient>
  </defs>

  <rect width="512" height="512" rx="96" fill="${GREEN}"/>

  <g fill="url(#gold)">
    <!-- globe -->
    <circle cx="256" cy="138" r="48"/>
    <!-- corps torsadé (les deux silhouettes qui soutiennent le globe) -->
    <path d="M256 182 C224 193 211 232 229 276 C240 303 238 315 256 326
             C274 315 272 303 283 276 C301 232 288 193 256 182 Z"/>
    <!-- évasement vers la base -->
    <path d="M256 322 C236 331 223 346 219 368 L293 368 C289 346 276 331 256 322 Z"/>
    <!-- socle -->
    <rect x="206" y="362" width="100" height="26" rx="10"/>
    <rect x="220" y="388" width="72" height="16" rx="7"/>
  </g>

  <!-- méridiens du globe (or foncé) -->
  <g fill="none" stroke="#A9790F" stroke-width="2.5">
    <ellipse cx="256" cy="138" rx="20" ry="48"/>
    <ellipse cx="256" cy="138" rx="48" ry="19"/>
  </g>

  <text x="256" y="466" text-anchor="middle"
        font-family="Arial, Helvetica, sans-serif" font-size="66" font-weight="800"
        fill="#ffffff">CDM26</text>
</svg>`

for (const size of [192, 512]) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(`public/icon-${size}.png`)
  console.log(`écrit public/icon-${size}.png`)
}

// favicon (48px) cohérent
await sharp(Buffer.from(svg)).resize(48, 48).png().toFile('public/favicon.ico')
console.log('écrit public/favicon.ico')
