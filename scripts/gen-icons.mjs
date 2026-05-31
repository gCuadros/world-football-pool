// Genera los iconos PWA (trofeo blanco sobre azul #0066B2) en /public.
// Uso: node scripts/gen-icons.mjs
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(__dirname, "..", "public");

const BLUE = "#0066B2";

// Paths del trofeo (lucide "trophy"), en viewBox 24×24.
const TROPHY = [
  "M6 9H4.5a2.5 2.5 0 0 1 0-5H6",
  "M18 9h1.5a2.5 2.5 0 0 0 0-5H18",
  "M4 22h16",
  "M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22",
  "M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22",
  "M18 2H6v7a6 6 0 0 0 12 0V2Z",
];

function svg({ size, coverage, rounded }) {
  const k = (size * coverage) / 24;
  const cx = size / 2;
  const cy = size / 2;
  const rx = rounded ? size * 0.22 : 0;
  const sw = 1.7; // grosor en espacio 24
  const paths = TROPHY.map((d) => `<path d="${d}" />`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${rx}" fill="${BLUE}" />
  <g transform="translate(${cx} ${cy}) scale(${k}) translate(-12 -12)"
     fill="none" stroke="#ffffff" stroke-width="${sw}"
     stroke-linecap="round" stroke-linejoin="round">
    ${paths}
  </g>
</svg>`;
}

async function render(name, opts) {
  const buf = Buffer.from(svg(opts));
  await sharp(buf).png().toFile(join(PUBLIC, name));
  console.log("  ✓", name);
}

console.log("🎨 Generando iconos PWA…");
await render("icon-192.png", { size: 192, coverage: 0.52, rounded: true });
await render("icon-512.png", { size: 512, coverage: 0.52, rounded: true });
await render("icon-maskable-512.png", { size: 512, coverage: 0.42, rounded: false });
await render("apple-icon-180.png", { size: 180, coverage: 0.54, rounded: false });
console.log("✅ Iconos generados en /public");
