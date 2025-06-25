const fs = require('fs');
const path = require('path');
const https = require('https');
const { minify } = require('html-minifier-terser');

// ---------- CONFIG ----------
const OUTPUT_FILE = 'dist/packed-ad.html';
const INPUT_HTML  = 'index.html';
const INPUT_CSS   = 'style.css';
const INPUT_JS    = 'script.js';
const ASSET_DIR   = 'assets';

const FONTS_LOCAL = [
  { family: 'Orbitron', weight: 900, file: 'fonts/Orbitron-Medium.ttf' },
  { family: 'Exo 2',    weight: 400, file: 'fonts/Exo-Regular.ttf' },
  { family: 'Exo 2',    weight: 700, file: 'fonts/Exo-Regular.ttf' }
];

function loadLocalFonts() {
  return FONTS_LOCAL.map(f => {
    const b64 = fs.readFileSync(f.file).toString('base64');
    return `@font-face{font-family:'${f.family}';font-style:normal;` +
           `font-weight:${f.weight};src:url(data:font/woff2;base64,${b64})` +
           ` format('woff2');font-display:swap;}`;
  }).join('');
}

// ---------- HELPERS ----------
function fetchRemote(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      const chunks = [];
      res.on('data', d => chunks.push(d));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

async function fetchGoogleFontBase64(family, weight) {
  const cssUrl = `https://fonts.googleapis.com/css2?family=${family}:wght@${weight}&display=swap`;
  const cssBuf = await fetchRemote(cssUrl);
  const cssText = cssBuf.toString();
  const urlMatch = cssText.match(/url\(([^)]+\.woff2[^)]*)\)/);
  if (!urlMatch) throw new Error(`WOFF2 url not found for ${family} ${weight}`);
  const fontUrl = urlMatch[1].replace(/['"()]/g, "");
  const fontBuf = await fetchRemote(fontUrl);
  const b64 = fontBuf.toString('base64');
  const fontFamily = family.replace('+', ' ');
  return `@font-face{font-family:'${fontFamily}';font-style:normal;font-weight:${weight};src:url(data:font/woff2;base64,${b64}) format('woff2');font-display:swap;}`;
}

function embedImages(jsCode) {
  const files = fs.readdirSync(ASSET_DIR).filter(f => /\.png$/i.test(f)).sort();
  const b64Arr = files.map(f => fs.readFileSync(path.join(ASSET_DIR, f)).toString('base64'));
  const textureArrayJs = `const GEM_TEXTURES_B64=${JSON.stringify(b64Arr)};`;
  // prepend array to JS
  return textureArrayJs + '\n' + jsCode;
}

async function build() {
  // Read sources
  let html = fs.readFileSync(INPUT_HTML,'utf8');
  const css  = fs.readFileSync(INPUT_CSS,'utf8');
  let js     = fs.readFileSync(INPUT_JS,'utf8');

  // Embed images into JS
  js = embedImages(js);

  // Fetch & embed fonts
  const fontCssParts = [];

  const fontCss = loadLocalFonts();

  // Inline CSS (fonts + existing css)
  const fullCss = `<style>${fontCss}${css}</style>`;
  html = html.replace(/<link[^>]+style\.css[^>]+>/i, fullCss);

  // Inline JS
  const fullJs = `<script>${js}</script>`;
  html = html.replace(/<script[^>]+script\.js[^>]+><\/script>/i, fullJs);

  // Remove any external font/link tag leftovers
  html = html.replace(/<link[^>]+fonts\.googleapis[^>]*>/gi, '');
  html = html.replace(/<link[^>]+mraid.*?>/i,''); // mraid kept? if needed remove later

  // Minify to single line
  const minified = await minify(html, {
    collapseWhitespace:true,
    removeComments:true,
    minifyCSS:true,
    minifyJS:true
  });

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, minified);
  console.log(`✓ Generated ${OUTPUT_FILE} (${(minified.length/1024).toFixed(1)} kB)`);
}

build().catch(err=>{console.error(err); process.exit(1);}); 