import sharp from "sharp";

const markPngPath = "public/images/preve-search-mark.png";
const logoPngPath = "public/images/preve-logo.png";

const markSvg = Buffer.from(`
  <svg width="96" height="96" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="preveLens" x1="24" y1="18" x2="72" y2="78" gradientUnits="userSpaceOnUse">
        <stop stop-color="#FFB08A"/>
        <stop offset="0.52" stop-color="#F05522"/>
        <stop offset="1" stop-color="#D84A24"/>
      </linearGradient>
    </defs>
    <circle cx="43" cy="41" r="20" fill="none" stroke="url(#preveLens)" stroke-width="10" stroke-linecap="round"/>
    <path d="M58.5 56.5L75 73" fill="none" stroke="url(#preveLens)" stroke-width="11" stroke-linecap="round"/>
    <circle cx="37.5" cy="36.5" r="4.2" fill="#D84A24"/>
    <path d="M47 34.5C50.4 39.2 50.1 45.8 46.2 50.2" fill="none" stroke="#D84A24" stroke-width="4.8" stroke-linecap="round"/>
  </svg>
`);

await sharp(markSvg)
  .resize(1024, 1024, { fit: "contain" })
  .png()
  .toFile(markPngPath);

const markBuffer = await sharp(markSvg)
  .resize(180, 180, { fit: "contain" })
  .png()
  .toBuffer();

const wordmarkSvg = Buffer.from(`
  <svg width="560" height="220" viewBox="0 0 560 220" xmlns="http://www.w3.org/2000/svg">
    <text
      x="0"
      y="158"
      fill="#F05522"
      font-family="Plus Jakarta Sans, Segoe UI, Arial, sans-serif"
      font-size="154"
      font-weight="700"
      letter-spacing="0"
    >preve</text>
  </svg>
`);

await sharp({
  create: {
    width: 760,
    height: 220,
    channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  },
})
  .composite([
    { input: markBuffer, left: 0, top: 20 },
    { input: wordmarkSvg, left: 200, top: 0 },
  ])
  .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 1 })
  .png()
  .toFile(logoPngPath);

console.log(`Created ${markPngPath}`);
console.log(`Created ${logoPngPath}`);
