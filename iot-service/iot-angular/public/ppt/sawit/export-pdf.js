#!/usr/bin/env node
/**
 * Export presentasi Devetek × TAP Agri ke PDF
 * Usage: node export-pdf.js [output-filename.pdf] [scale]
 */

const puppeteer = require('puppeteer');
const path = require('path');
const http = require('http');
const fs = require('fs');

const OUTPUT = process.argv[2] || 'Devetek_TAP_Proposal.pdf';
const RENDER_SCALE = Math.max(1, Number(process.argv[3]) || 2);
const PORT = 9876;
const SLIDE_WIDTH = 1280;
const SLIDE_HEIGHT = 720;

// Simple static file server
function startServer(dir) {
  const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
  };

  const server = http.createServer((req, res) => {
    let filePath = path.join(dir, decodeURIComponent(req.url === '/' ? 'index.html' : req.url));
    const ext = path.extname(filePath);
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    });
  });

  return new Promise((resolve) => {
    server.listen(PORT, () => resolve(server));
  });
}

(async () => {
  console.log('🚀 Starting local server...');
  const server = await startServer(__dirname);

  console.log('🌐 Launching browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({
    width: SLIDE_WIDTH,
    height: SLIDE_HEIGHT,
    deviceScaleFactor: RENDER_SCALE,
  });

  console.log('📄 Loading presentation...');
  await page.goto(`http://localhost:${PORT}/index.html`, {
    waitUntil: 'networkidle0',
    timeout: 30000,
  });

  // Wait for Iconify icons to render
  await new Promise(r => setTimeout(r, 3000));

  // Get total slides
  const totalSlides = await page.evaluate(() => {
    return document.querySelectorAll('.slide').length;
  });
  console.log(`📊 Found ${totalSlides} slides`);
  console.log(`🔍 Render scale: ${RENDER_SCALE}x`);

  // Generate PDF using screen rendering
  await page.emulateMediaType('screen');

  console.log('🖨️  Generating PDF (slide by slide)...');

  // Reset: hide all slides, show one at a time for screenshot
  await page.evaluate(() => {
    const canvas = document.getElementById('canvas');
    canvas.style.transform = 'none';
    canvas.style.width = '1280px';
    canvas.style.height = '720px';
    canvas.style.overflow = 'hidden';
    canvas.style.display = 'block';

    const stage = document.getElementById('stage');
    stage.style.width = '1280px';
    stage.style.height = '720px';
    stage.style.overflow = 'hidden';

    // Hide nav
    const nav = document.getElementById('nav-bar');
    if (nav) nav.style.display = 'none';
    const progress = document.getElementById('progress-bar');
    if (progress) progress.style.display = 'none';
    const overview = document.getElementById('overview');
    if (overview) overview.style.display = 'none';

    // Hide all slides
    document.querySelectorAll('.slide').forEach(s => {
      s.style.position = 'absolute';
      s.style.top = '0';
      s.style.left = '0';
      s.style.width = '1280px';
      s.style.height = '720px';
      s.style.display = 'none';
      s.classList.remove('active', 'animate-enter', 'animate-enter-back');
    });
  });

  // Capture each slide as screenshot (PNG), then embed into PDF
  // Screenshot approach ensures all background-images, icons render correctly

  const { PDFDocument: PDFDoc, PageSizes } = require('pdf-lib');
  const mergedPdf = await PDFDoc.create();

  for (let i = 1; i <= totalSlides; i++) {
    await page.evaluate((idx) => {
      document.querySelectorAll('.slide').forEach(s => {
        s.style.display = 'none';
        s.classList.remove('active');
      });
      const slide = document.getElementById('slide-' + idx) || document.querySelectorAll('.slide')[idx - 1];
      if (slide) {
        slide.style.display = 'flex';
        slide.classList.add('active');
      }
    }, i);

    // Wait for images/icons to render
    await new Promise(r => setTimeout(r, 800));

    // Take screenshot as PNG
    const screenshotBuffer = await page.screenshot({
      type: 'png',
      clip: { x: 0, y: 0, width: SLIDE_WIDTH, height: SLIDE_HEIGHT },
    });

    // Embed PNG into PDF page
    const pngImage = await mergedPdf.embedPng(screenshotBuffer);
    const page_ = mergedPdf.addPage([SLIDE_WIDTH, SLIDE_HEIGHT]);
    page_.drawImage(pngImage, {
      x: 0,
      y: 0,
      width: SLIDE_WIDTH,
      height: SLIDE_HEIGHT,
    });

    process.stdout.write(`   Slide ${String(i).padStart(2, '0')}/${totalSlides}\r`);
  }
  console.log('');

  const pdfBytes = await mergedPdf.save();
  fs.writeFileSync(path.join(__dirname, OUTPUT), pdfBytes);

  console.log(`✅ PDF saved: ${OUTPUT} (${totalSlides} pages)`);
  console.log(`   Size: ${(pdfBytes.length / 1024 / 1024).toFixed(2)} MB`);

  await browser.close();
  server.close();
})();
