// Lint posts and image assets. Re-runnable; exits non-zero on failure so it can
// gate a commit.
//
//   node _scripts/verify.mjs
//
// Env overrides: OUT_IMAGES, OUT_MARKDOWN

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dimensions } from './image-size.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const IMAGES = process.env.OUT_IMAGES || join(REPO, 'assets', 'images');
const MARKDOWN = process.env.OUT_MARKDOWN || join(REPO, '_posts');

let failed = 0;
const check = (ok, label, detail = '') => {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ' - ' + detail : ''}`);
};

const imageFiles = readdirSync(IMAGES);
const pictures = imageFiles.filter((f) => /\.(webp|jpe?g|png)$/i.test(f));
const posts = readdirSync(MARKDOWN).filter((f) => f.endsWith('.md'));
const imageSet = new Set(imageFiles);
console.log(`${posts.length} posts, ${pictures.length} images\n`);

// --- images -------------------------------------------------------------
// A saved HTML error page or a lazy-load placeholder would slip through a
// mere existence check, so verify the bytes really are an image.
const tiny = pictures.filter((f) => statSync(join(IMAGES, f)).size < 5120);
check(tiny.length === 0, 'no image under 5 KB (placeholder guard)', tiny.join(', '));

const badMagic = [];
for (const f of pictures) {
  const b = readFileSync(join(IMAGES, f));
  const ext = f.split('.').pop().toLowerCase();
  const ok =
    ext === 'webp' ? b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP'
    : ext === 'png' ? b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    : b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff; // jpg/jpeg
  if (!ok) badMagic.push(f);
}
check(badMagic.length === 0, 'image file signatures valid', badMagic.join(', '));

// --- posts --------------------------------------------------------------
const dangling = [], dupes = [], boms = [], badFm = [], missingHeroDims = [], missingBodyDims = [], wrongDims = [];
const referenced = new Set();

for (const file of posts) {
  const raw = readFileSync(join(MARKDOWN, file));
  if (raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf) boms.push(file); // breaks frontmatter parsing
  const text = raw.toString('utf8').replace(/\r\n/g, '\n'); // CRLF checkouts must not be skipped

  if (!text.startsWith('---\n')) { badFm.push(file); continue; }
  const parts = text.split(/^---\n/m);
  const fm = parts[1] ?? '';
  const body = parts.slice(2).join('---\n');

  const refs = [...text.matchAll(/\/assets\/images\/([^)\s"']+)/g)].map((m) => m[1]);
  refs.forEach((r) => {
    referenced.add(r);
    if (!imageSet.has(r)) dangling.push(`${file} -> ${r}`);
  });
  if (new Set(refs).size !== refs.length) dupes.push(file);

  // A hero without dimensions still renders - it just reintroduces layout shift.
  const hero = fm.match(/^image: \/assets\/images\/(\S+)$/m)?.[1];
  if (hero && !/^image_width:\s*\d+/m.test(fm)) missingHeroDims.push(file);

  // Declared dimensions must match the actual file, or space is reserved wrongly.
  if (hero && imageSet.has(hero) && /^image_width:\s*(\d+)/m.test(fm)) {
    const w = +fm.match(/^image_width:\s*(\d+)/m)[1];
    const h = +fm.match(/^image_height:\s*(\d+)/m)?.[1];
    try {
      const [aw, ah] = dimensions(readFileSync(join(IMAGES, hero)));
      if (aw !== w || ah !== h) wrongDims.push(`${file} says ${w}x${h}, file is ${aw}x${ah}`);
    } catch {}
  }

  for (const line of body.split('\n')) {
    const m = line.match(/^!\[[^\]]*\]\(\/assets\/images\/(\S+?)\)(.*)$/);
    if (m && !/width="\d+"/.test(m[2])) missingBodyDims.push(`${file}: ${m[1]}`);
  }
}

check(dangling.length === 0, 'all /assets/images references resolve', dangling.join(', '));
check(dupes.length === 0, 'no image referenced twice in one post', dupes.join(', '));
check(boms.length === 0, 'no UTF-8 BOM in posts', boms.join(', '));
check(badFm.length === 0, 'all posts open with frontmatter', badFm.join(', '));
check(missingHeroDims.length === 0, 'every hero declares dimensions', missingHeroDims.join(', '));
check(missingBodyDims.length === 0, 'every body image declares dimensions', missingBodyDims.join(', '));
check(wrongDims.length === 0, 'declared dimensions match the files', wrongDims.join(' | '));

const orphans = pictures.filter((f) => !referenced.has(f));
if (orphans.length) console.log(`NOTE  ${orphans.length} image(s) not referenced by any post: ${orphans.join(', ')}`);

console.log(`\n${failed === 0 ? 'ALL CHECKS PASSED' : failed + ' CHECK(S) FAILED'}`);
process.exitCode = failed ? 1 : 0;
