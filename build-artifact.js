#!/usr/bin/env node
// Derives artifact.html from index.html.
//
// Claude Artifacts wrap the uploaded file in their own <!doctype>/<head>/<body>
// skeleton, so the published file must contain page *content* only — no
// document wrapper. This strips the wrapper and keeps index.html as the single
// source of truth: edit index.html, re-run this, re-publish.
//
//   node build-artifact.js

const fs = require('fs');
const path = require('path');

const dir = __dirname;
const src = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');

const grab = (re, what) => {
  const m = src.match(re);
  if (!m) throw new Error(`build-artifact: could not find ${what} in index.html`);
  return m[1];
};

const title = grab(/<title>([\s\S]*?)<\/title>/i, '<title>');
const style = grab(/<style>([\s\S]*?)<\/style>/i, '<style>');
const body  = grab(/<body>([\s\S]*?)<\/body>/i, '<body>');

const out = `<title>${title}</title>\n<style>${style}</style>\n${body.trim()}\n`;

const dest = path.join(dir, 'artifact.html');
fs.writeFileSync(dest, out);
console.log(`wrote ${path.relative(process.cwd(), dest)} (${out.length} bytes)`);
