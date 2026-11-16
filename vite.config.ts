import fs from 'node:fs';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

const EXPORT_BUNDLE_DIR = '/tmp/export-bundle';

function exportDownloadPlugin() {
  return {
    name: 'osmosis-export-download',
    configureServer(server: {middlewares: {use: (fn: (req: any, res: any, next: () => void) => void) => void}}) {
      server.middlewares.use((req, res, next) => {
        const reqPath = (req.url || '').split('?')[0];

        if (reqPath.startsWith('/export-files/')) {
          const filename = path.basename(reqPath.slice('/export-files/'.length));
          if (!/^[a-zA-Z0-9._-]+$/.test(filename)) {
            res.statusCode = 400;
            res.end('Invalid filename.');
            return;
          }
          const fullPath = path.join(EXPORT_BUNDLE_DIR, filename);
          if (!fs.existsSync(fullPath)) {
            res.statusCode = 404;
            res.end('Archive part not found.');
            return;
          }
          const stat = fs.statSync(fullPath);
          const isZip = filename.endsWith('.zip');
          res.statusCode = 200;
          res.setHeader('Content-Type', isZip ? 'application/zip' : 'application/octet-stream');
          if (isZip) {
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
          }
          res.setHeader('Content-Length', String(stat.size));
          res.setHeader('Cache-Control', 'no-store');
          if (req.method === 'HEAD') {
            res.end();
            return;
          }
          fs.createReadStream(fullPath).pipe(res);
          return;
        }

        if (reqPath === '/export' || reqPath === '/export/') {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.setHeader('Cache-Control', 'no-store');
          if (req.method === 'HEAD') {
            res.end();
            return;
          }
          res.end(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Download Osmosis STEM Dictionary Folder</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        font-family: system-ui, -apple-system, sans-serif;
        background: linear-gradient(135deg, #e0c3fc 0%, #c2e9fb 50%, #a1c4fd 100%);
        color: #0f172a;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
        box-sizing: border-box;
      }
      .card {
        width: 100%;
        max-width: 560px;
        background: rgba(255, 255, 255, 0.9);
        backdrop-filter: blur(16px);
        border: 2px solid rgba(255, 255, 255, 0.9);
        border-radius: 24px;
        padding: 22px;
        box-shadow: 0 20px 50px rgba(15, 23, 42, 0.16);
      }
      .brand { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
      .brand img { width: 46px; height: 46px; border-radius: 12px; object-fit: cover; }
      h1 { margin: 0; font-size: 1.2rem; color: #1e1b4b; }
      p { margin: 8px 0 0; font-size: 0.9rem; line-height: 1.5; color: #334155; }
      .actions { display: grid; gap: 10px; margin-top: 18px; }
      button.btn, a.part {
        display: flex; flex-direction: column; gap: 3px; text-align: left;
        text-decoration: none; padding: 13px 15px; border-radius: 14px;
        font-weight: 700; font-size: 0.92rem; border: 0; cursor: pointer;
      }
      .btn-primary { background: #1a237e; color: #fff; }
      .btn-secondary { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #fff; }
      .btn:disabled { opacity: 0.6; cursor: wait; }
      .sub { font-size: 0.76rem; font-weight: 500; opacity: 0.92; }
      .status { margin-top: 12px; font-size: 0.85rem; font-weight: 700; color: #4338ca; min-height: 1.2em; }
      .parts { margin-top: 18px; padding-top: 14px; border-top: 1px dashed rgba(15,23,42,0.18); }
      .parts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 10px; }
      a.part { background: rgba(79, 70, 229, 0.1); color: #1e1b4b; font-size: 0.8rem; padding: 10px 12px; border: 1px solid rgba(79, 70, 229, 0.22); }
      .back { display: inline-block; margin-top: 16px; font-size: 0.85rem; font-weight: 700; color: #4f46e5; text-decoration: none; }
      @media (max-width: 480px) { .parts-grid { grid-template-columns: 1fr; } }
    </style>
  </head>
  <body>
    <main class="card">
      <div class="brand">
        <img src="/assets/icon-192.png" alt="Osmosis STEM Dictionary" />
        <div>
          <h1>Download Project Archives</h1>
          <p style="margin-top:2px;font-size:0.78rem;color:#475569;">Chunked safely under 12 MB per request</p>
        </div>
      </div>
      <p>Click either button below to assemble and download the complete single ZIP directly in your browser:</p>
      <div class="actions">
        <button id="btn-dist" class="btn btn-primary" onclick="downloadStitched('dist', 'osmosis-stem-dictionary-dist.zip')">
          <span>Download Ready-to-Host Site (dist.zip · 67.6 MB)</span>
          <span class="sub">Unzip &amp; drag dist/ straight onto Netlify Drop or Cloudflare Pages</span>
        </button>
        <button id="btn-src" class="btn btn-secondary" onclick="downloadStitched('source', 'osmosis-stem-dictionary-source.zip')">
          <span>Download Full Source Code (source.zip · 67.6 MB)</span>
          <span class="sub">Complete React + Vite + Tailwind source &amp; public/ assets</span>
        </button>
      </div>
      <div id="status" class="status"></div>
      <div class="parts">
        <p style="font-size:0.8rem;font-weight:700;color:#1e293b;margin:0;">Or download individual source ZIP parts (&lt; 23 MB each):</p>
        <div class="parts-grid">
          <a class="part" href="/export-files/1-osmosis-source-core.zip" download="1-osmosis-source-core.zip">1. Core App + 27k Terms (5.0 MB)</a>
          <a class="part" href="/export-files/2-osmosis-diagrams-part1.zip" download="2-osmosis-diagrams-part1.zip">2. Diagrams Part 1 (18.1 MB)</a>
          <a class="part" href="/export-files/3-osmosis-diagrams-part2.zip" download="3-osmosis-diagrams-part2.zip">3. Diagrams Part 2 (22.1 MB)</a>
          <a class="part" href="/export-files/4-osmosis-diagrams-part3.zip" download="4-osmosis-diagrams-part3.zip">4. Diagrams Part 3 (21.7 MB)</a>
        </div>
      </div>
      <a class="back" href="/">&larr; Back to Osmosis STEM Dictionary</a>
    </main>
    <script>
      async function downloadStitched(kind, filename) {
        const status = document.getElementById('status');
        const b1 = document.getElementById('btn-dist');
        const b2 = document.getElementById('btn-src');
        b1.disabled = true; b2.disabled = true;
        try {
          const blobs = [];
          for (let i = 0; i < 6; i++) {
            status.textContent = 'Downloading ' + filename + ' (part ' + (i + 1) + ' of 6)...';
            const res = await fetch('/export-files/' + kind + '.part' + i, { cache: 'no-store' });
            if (!res.ok) throw new Error('HTTP ' + res.status);
            blobs.push(await res.blob());
          }
          status.textContent = 'Building ZIP file...';
          const fullBlob = new Blob(blobs, { type: 'application/zip' });
          const url = URL.createObjectURL(fullBlob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(url), 10000);
          status.textContent = 'Download started: ' + filename;
        } catch (err) {
          status.textContent = 'Could not assemble ZIP automatically (' + err.message + '). Use the 4 individual ZIP parts below!';
        } finally {
          b1.disabled = false; b2.disabled = false;
        }
      }
    </script>
  </body>
</html>`);
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    base: './',
    plugins: [react(), tailwindcss(), exportDownloadPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
