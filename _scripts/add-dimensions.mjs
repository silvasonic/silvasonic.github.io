// Declare intrinsic image dimensions on every post, so the browser reserves
// space before images load instead of reflowing the page (layout shift).
//
//   node _scripts/add-dimensions.mjs
//
// Env overrides: OUT_IMAGES, OUT_MARKDOWN
//
//   hero -> image_width / image_height frontmatter, read by _layouts/post.html
//           and index.html (both guard on image_width, so posts without it
//           still render fine)
//   body -> kramdown span IAL:  ![alt](src){: width="W" height="H"}
//
// Idempotent: posts already carrying dimensions are skipped, so it is safe to
// re-run after adding new posts.

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dimensions } from './image-size.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const IMAGES = process.env.OUT_IMAGES || join(REPO, 'assets', 'images');
const MARKDOWN = process.env.OUT_MARKDOWN || join(REPO, '_posts');

const dims = {};
for (const f of readdirSync(IMAGES)) {
  if (!/\.(webp|jpe?g|png)$/i.test(f)) continue; // skip PDFs and other assets
  try {
    dims[f] = dimensions(readFileSync(join(IMAGES, f)));
  } catch (e) {
    console.warn(`  ! ${f}: ${e.message}`);
  }
}

let heroes = 0, bodies = 0, skipped = 0;
for (const file of readdirSync(MARKDOWN).filter((f) => f.endsWith('.md'))) {
  // Normalise CRLF, or files checked out with core.autocrlf=true never match
  // the frontmatter split and get silently skipped. core.autocrlf normalises
  // back to LF on commit, so writing LF here produces no spurious diff.
  const src = readFileSync(join(MARKDOWN, file), 'utf8').replace(/\r\n/g, '\n');
  const parts = src.split(/^---\n/m);
  if (parts.length < 3) continue; // no frontmatter, not a post
  const fm = parts[1];
  const body = parts.slice(2).join('---\n');

  // --- hero -------------------------------------------------------------
  let newFm = fm;
  const heroName = fm.match(/^image: \/assets\/images\/(\S+)$/m)?.[1];
  if (heroName && !/^image_width:/m.test(fm)) {
    if (!dims[heroName]) {
      console.warn(`  ! ${file}: no dimensions for hero ${heroName}`);
    } else {
      const [w, h] = dims[heroName];
      newFm = fm.replace(/^(image: \S+)$/m, `$1\nimage_width: ${w}\nimage_height: ${h}`);
      heroes++;
    }
  } else if (heroName) {
    skipped++;
  }

  // --- body -------------------------------------------------------------
  // `[ \t]*$` not `\s*$` - \s would swallow the blank lines between images.
  // Lines that already end in an IAL do not match, so re-runs are no-ops.
  const newBody = body.replace(/^!\[([^\]]*)\]\(\/assets\/images\/(\S+?)\)[ \t]*$/gm, (line, alt, name) => {
    if (!dims[name]) {
      console.warn(`  ! ${file}: no dimensions for ${name}`);
      return line;
    }
    const [w, h] = dims[name];
    bodies++;
    return `![${alt}](/assets/images/${name}){: width="${w}" height="${h}"}`;
  });

  if (newFm !== fm || newBody !== body) writeFileSync(join(MARKDOWN, file), `---\n${newFm}---\n${newBody}`, 'utf8');
}

console.log(`added dimensions to ${heroes} heroes and ${bodies} body images`);
console.log(`${skipped} posts already had them (skipped)`);
