// Extract text from local documents in _ai-uploads-KEEP-LOCAL into Markdown files
// Supported: .pdf (pdf-parse), .docx (mammoth), .md (copy), .txt (wrap)
// Output: _ai-uploads-KEEP-LOCAL/extracted-text/<basename>.md
// Usage:
//   1) npm install pdf-parse mammoth
//   2) node scripts/extract-text.mjs

import fs from 'fs/promises';
import path from 'path';
import process from 'process';

// Lazy imports so script runs even if deps missing until we actually need them
let pdfParse = null;
let mammoth = null;

const ROOT = process.cwd();
const INPUT_DIR = path.join(ROOT, '_ai-uploads-KEEP-LOCAL');
const OUTPUT_DIR = path.join(INPUT_DIR, 'extracted-text');

const SUPPORTED = new Set(['.pdf', '.docx', '.md', '.txt']);

async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true });
}

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    if (e.name === 'extracted-text') continue; // skip output dir
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      const child = await walk(full);
      files.push(...child);
    } else {
      files.push(full);
    }
  }
  return files;
}

function toSlugBase(p) {
  const base = path.basename(p, path.extname(p));
  return base.replace(/[^a-zA-Z0-9\-_. ]/g, '').replace(/\s+/g, '-');
}

function header(meta) {
  const lines = [
    '---',
    `source_filename: ${meta.source_filename}`,
    `source_path: ${meta.source_path}`,
    `extracted_at: ${new Date().toISOString()}`,
    '---',
    ''
  ];
  return lines.join('\n');
}

async function extractPdf(filePath) {
  if (!pdfParse) {
    try {
      pdfParse = (await import('pdf-parse')).default;
    } catch (e) {
      throw new Error('Missing dependency pdf-parse. Run: npm install pdf-parse');
    }
  }
  const data = await fs.readFile(filePath);
  const res = await pdfParse(data);
  return res.text || '';
}

async function extractDocx(filePath) {
  if (!mammoth) {
    try {
      mammoth = await import('mammoth');
    } catch (e) {
      throw new Error('Missing dependency mammoth. Run: npm install mammoth');
    }
  }
  const buf = await fs.readFile(filePath);
  const res = await mammoth.convertToMarkdown({ buffer: buf });
  return res.value || '';
}

async function run() {
  await ensureDir(OUTPUT_DIR);
  const all = await walk(INPUT_DIR);
  const candidates = all.filter(p => SUPPORTED.has(path.extname(p).toLowerCase()));

  let processed = 0; let skipped = 0; let errors = 0;
  for (const file of candidates) {
    const ext = path.extname(file).toLowerCase();
    try {
      let content = '';
      if (ext === '.md') {
        content = await fs.readFile(file, 'utf8');
      } else if (ext === '.txt') {
        const txt = await fs.readFile(file, 'utf8');
        content = txt;
      } else if (ext === '.pdf') {
        content = await extractPdf(file);
      } else if (ext === '.docx') {
        content = await extractDocx(file);
      } else {
        skipped++;
        continue;
      }

      const outName = `${toSlugBase(file)}.md`;
      const outPath = path.join(OUTPUT_DIR, outName);
      const meta = { source_filename: path.basename(file), source_path: path.relative(ROOT, file) };
      const body = content.trim();
      const wrapped = `${header(meta)}${body}`;
      await fs.writeFile(outPath, wrapped, 'utf8');
      processed++;
      console.log(`✔ Extracted -> ${path.relative(ROOT, outPath)}`);
    } catch (e) {
      errors++;
      console.error(`✖ Failed: ${path.relative(ROOT, file)} -> ${e.message}`);
    }
  }

  console.log(`\nDone. Processed: ${processed}, Skipped: ${skipped}, Errors: ${errors}`);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
