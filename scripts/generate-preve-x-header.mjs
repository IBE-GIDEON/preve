import sharp from "sharp";

const width = 1500;
const height = 500;
const outPath = "public/images/preve-x-header.png";

function pixelField() {
  const blocks = [];
  let seed = 42;

  function random() {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  }

  for (let y = 10; y < height - 14; y += 12) {
    for (let x = 6; x < width - 6; x += 12) {
      const leftBias = 1 - x / width;
      const wave = Math.sin((x + y) * 0.018) * 0.16 + 0.18;
      const chance = 0.08 + leftBias * 0.34 + wave;

      if (random() > chance) continue;

      const size = random() > 0.82 ? 7 : 5;
      const orangeLift = Math.max(0, 1 - Math.abs(x - 270) / 410);
      const alpha = 0.08 + leftBias * 0.2 + random() * 0.12;
      const fill =
        random() < 0.38 + orangeLift * 0.32
          ? `rgba(240,85,34,${Math.min(0.46, alpha + orangeLift * 0.18).toFixed(3)})`
          : `rgba(255,255,255,${Math.min(0.18, alpha).toFixed(3)})`;

      blocks.push(`<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="1.2" fill="${fill}"/>`);
    }
  }

  return blocks.join("");
}

function memoryNodes() {
  const items = [];
  let seed = 78;

  function random() {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  }

  for (let i = 0; i < 170; i += 1) {
    const x = 18 + random() * 1380;
    const y = 24 + random() * 430;
    const leftLift = Math.max(0, 1 - x / 820);
    const size = random() > 0.86 ? 4.2 : 2.6;
    const opacity = 0.08 + random() * 0.1 + leftLift * 0.08;
    const color =
      random() < 0.34 + leftLift * 0.28
        ? `rgba(240,85,34,${opacity.toFixed(3)})`
        : `rgba(255,255,255,${Math.min(0.14, opacity).toFixed(3)})`;

    items.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${size}" fill="${color}"/>`);
  }

  return items.join("");
}

function connectionLines() {
  return `
    <path d="M72 335 C210 240, 335 382, 512 268 S790 190, 1010 280" stroke="rgba(240,85,34,0.16)" stroke-width="1.4" fill="none"/>
    <path d="M98 186 C270 100, 426 204, 610 146 S875 126, 1108 214" stroke="rgba(255,255,255,0.08)" stroke-width="1.2" fill="none"/>
    <path d="M162 420 C332 336, 470 390, 650 330 S914 286, 1235 365" stroke="rgba(240,85,34,0.10)" stroke-width="1.2" fill="none"/>
  `;
}

function archiveCard(x, y, w, h, title, meta, accent = "#F05522") {
  return `
    <g opacity="0.78">
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="rgba(255,255,255,0.045)" stroke="rgba(255,255,255,0.10)"/>
      <rect x="${x + 18}" y="${y + 18}" width="9" height="9" rx="4.5" fill="${accent}"/>
      <text x="${x + 38}" y="${y + 28}" fill="rgba(255,255,255,0.72)" font-family="Plus Jakarta Sans, Inter, Segoe UI, Arial, sans-serif" font-size="15" font-weight="700">${title}</text>
      <text x="${x + 18}" y="${y + 58}" fill="rgba(255,255,255,0.42)" font-family="Cascadia Mono, Consolas, monospace" font-size="12">${meta}</text>
      <rect x="${x + 18}" y="${y + h - 34}" width="${Math.round(w * 0.58)}" height="5" rx="2.5" fill="rgba(255,255,255,0.13)"/>
      <rect x="${x + 18}" y="${y + h - 20}" width="${Math.round(w * 0.38)}" height="5" rx="2.5" fill="rgba(240,85,34,0.24)"/>
    </g>
  `;
}

const backgroundSvg = Buffer.from(`
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="orangeGlow" cx="24%" cy="55%" r="52%">
      <stop offset="0" stop-color="#F05522" stop-opacity="0.34"/>
      <stop offset="0.46" stop-color="#F05522" stop-opacity="0.11"/>
      <stop offset="1" stop-color="#F05522" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="searchGlow" cx="58%" cy="47%" r="34%">
      <stop offset="0" stop-color="#FFB08A" stop-opacity="0.14"/>
      <stop offset="1" stop-color="#FFB08A" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="fade" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#141113"/>
      <stop offset="0.48" stop-color="#09090D"/>
      <stop offset="1" stop-color="#050509"/>
    </linearGradient>
    <linearGradient id="cardWash" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.08"/>
      <stop offset="1" stop-color="#F05522" stop-opacity="0.04"/>
    </linearGradient>
    <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="14" stdDeviation="18" flood-color="#000000" flood-opacity="0.35"/>
    </filter>
    <filter id="blurred" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="18"/>
    </filter>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#fade)"/>
  <rect width="${width}" height="${height}" fill="url(#orangeGlow)"/>
  <rect width="${width}" height="${height}" fill="url(#searchGlow)"/>
  <circle cx="515" cy="248" r="134" fill="rgba(240,85,34,0.10)" filter="url(#blurred)"/>
  <g opacity="0.95">${connectionLines()}</g>
  <g opacity="0.68">${memoryNodes()}</g>
  <g opacity="0.34">${pixelField()}</g>
  <g transform="rotate(-3 290 260)">
    ${archiveCard(88, 118, 280, 116, "old thread", "pricing advice / saved", "#F05522")}
    ${archiveCard(184, 284, 310, 126, "best post", "react performance / remix", "#FFB08A")}
    ${archiveCard(410, 82, 260, 104, "idea match", "found in 0.08s", "#D84A24")}
  </g>
  <g opacity="0.55">
    <rect x="486" y="238" width="260" height="50" rx="25" fill="rgba(255,255,255,0.055)" stroke="rgba(255,255,255,0.11)"/>
    <circle cx="515" cy="263" r="8" fill="none" stroke="rgba(240,85,34,0.82)" stroke-width="3"/>
    <path d="M521 269 L531 279" stroke="rgba(240,85,34,0.82)" stroke-width="3" stroke-linecap="round"/>
    <text x="548" y="270" fill="rgba(255,255,255,0.50)" font-family="Cascadia Mono, Consolas, monospace" font-size="16">search memory</text>
  </g>
  <rect x="0" y="0" width="${width}" height="${height}" fill="rgba(0,0,0,0.13)"/>
  <rect x="650" y="0" width="850" height="500" fill="rgba(0,0,0,0.18)"/>
  <g filter="url(#softShadow)">
    <text x="775" y="230"
      fill="#FFFFFF"
      font-family="Plus Jakarta Sans, Inter, Segoe UI, Arial, sans-serif"
      font-size="96"
      font-weight="800"
      letter-spacing="-2">preve</text>
    <text x="775" y="308"
      fill="#FFFFFF"
      font-family="Cascadia Mono, Consolas, SFMono-Regular, monospace"
      font-size="34"
      font-weight="500"
      letter-spacing="0.4">Find every post again</text>
  </g>
</svg>
`);

const mark = await sharp("public/images/preve-search-mark.png")
  .resize(118, 118, { fit: "contain" })
  .png()
  .toBuffer();

await sharp(backgroundSvg)
  .composite([{ input: mark, left: 610, top: 145 }])
  .png()
  .toFile(outPath);

console.log(`Created ${outPath}`);
