// Migrate a WordPress category into Jekyll posts + local image assets.
//
//   node _scripts/migrate.mjs [--md-only]
//
// Env overrides: WP_SITE, WP_CATEGORY_SLUG, OUT_IMAGES, OUT_MARKDOWN
// No npm dependencies; needs Node 18+ for global fetch.
//
// NOTE: this writes frontmatter WITHOUT image_width/image_height. Run
// add-dimensions.mjs afterwards - see _scripts/README.md.

import { writeFile } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const SITE = process.env.WP_SITE || 'https://www.silvasonic.com';
// Slug drives both the crawl path and the API lookup - passing only an id would
// crawl /category/photos/ while querying a different category, and abort on the
// mismatch check below.
const CATEGORY_SLUG = process.env.WP_CATEGORY_SLUG || 'photos';
const IMAGES_DIR = process.env.OUT_IMAGES || join(REPO, 'assets', 'images');
const MARKDOWN_DIR = process.env.OUT_MARKDOWN || join(REPO, '_posts');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

const get = (url, as = 'text') =>
  fetch(url, { headers: { 'User-Agent': UA } }).then(async (r) => {
    if (!r.ok) return { ok: false, status: r.status };
    return { ok: true, status: r.status, body: as === 'buffer' ? Buffer.from(await r.arrayBuffer()) : await r.text() };
  });

const decode = (s) =>
  s
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

// NFD-normalize, drop combining marks, kebab-case. Reproduces WordPress's own
// slug for every title tested, including "Pão de Açúcar" -> pao-de-acucar.
const slugify = (title) =>
  title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

// Last dot-segment: `IMG_2058.HEIC.webp` -> `webp`, not `HEIC`.
const extOf = (url) => {
  const file = new URL(url).pathname.split('/').pop();
  const m = file.match(/\.([a-zA-Z0-9]+)$/);
  return m ? m[1].toLowerCase() : 'jpg';
};

async function pool(items, limit, worker) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await worker(items[i], i);
      }
    })
  );
  return out;
}

// ------------------------------------------------------- Step 0: resolve category
const catRes = await get(`${SITE}/wp-json/wp/v2/categories?slug=${CATEGORY_SLUG}&_fields=id,name,slug,count`);
if (!catRes.ok) throw new Error(`category lookup failed: HTTP ${catRes.status}`);
const [category] = JSON.parse(catRes.body);
if (!category) throw new Error(`no category with slug "${CATEGORY_SLUG}"`);
const CATEGORY_ID = category.id;
console.log(`Category "${category.name}" (slug ${category.slug}, id ${CATEGORY_ID}) - ${category.count} posts\n`);

// ---------------------------------------------------------------- Step 1: crawl
// The category pages are crawled only to cross-check the API result below.
console.log('Step 1: crawling category pages...');
const crawled = [];
for (let page = 1; page <= 50; page++) {
  const base = `${SITE}/category/${CATEGORY_SLUG}`;
  const url = page === 1 ? `${base}/` : `${base}/page/${page}/`;
  const res = await get(url);
  if (!res.ok) {
    console.log(`  page ${page}: HTTP ${res.status} - end of pagination`);
    break;
  }
  const links = [...res.body.matchAll(/<h2 class="wp-block-post-title"><a href="([^"]+)"/g)].map((m) => m[1]);
  console.log(`  page ${page}: ${links.length} posts`);
  crawled.push(...links);
}
const crawledSet = new Set(crawled.map((u) => u.replace(/\/$/, '')));
console.log(`  crawled ${crawledSet.size} unique post URLs`);

// ------------------------------------------------------------- Step 2: REST API
// The rendered HTML lazy-loads images (real URL sits in data-src, `src` is a
// base64 placeholder) and includes the site logo on every page. The REST API
// returns clean content scoped to the post body, so extraction happens here.
console.log('\nStep 2: fetching post data from REST API...');
const apiRes = await get(
  `${SITE}/wp-json/wp/v2/posts?categories=${CATEGORY_ID}&per_page=100&_fields=id,slug,date,link,title,content`
);
if (!apiRes.ok) throw new Error(`API request failed: HTTP ${apiRes.status}`);
const posts = JSON.parse(apiRes.body);
console.log(`  API returned ${posts.length} posts`);

const apiSet = new Set(posts.map((p) => p.link.replace(/\/$/, '')));
const missingFromApi = [...crawledSet].filter((u) => !apiSet.has(u));
const missingFromCrawl = [...apiSet].filter((u) => !crawledSet.has(u));
if (missingFromApi.length || missingFromCrawl.length) {
  console.error('  MISMATCH between crawled pages and API:');
  missingFromApi.forEach((u) => console.error('    crawled but not in API:', u));
  missingFromCrawl.forEach((u) => console.error('    in API but not crawled:', u));
  process.exit(1);
}
console.log('  OK: crawled URL set matches API post set exactly');

// ------------------------------------------------- Step 3/4: derive fields + names
const records = posts
  .map((p) => {
    const title = decode(p.title.rendered);
    const slug = slugify(title);
    // Every other filename component is sanitised (slug to [a-z0-9-], ext to
    // [a-zA-Z0-9]), but the date comes from the API verbatim and is joined onto
    // a write path - so validate it rather than trusting the response shape.
    const date = p.date.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`unexpected date for "${p.slug}": ${JSON.stringify(p.date)}`);
    const srcs = [...p.content.rendered.matchAll(/<img[^>]*\ssrc="([^"]+)"/g)].map((m) => m[1]);
    const images = srcs.map((url, i) => {
      const ext = extOf(url);
      const name = srcs.length === 1 ? `${date}-${slug}.${ext}` : `${date}-${slug}-${String(i + 1).padStart(2, '0')}.${ext}`;
      return { url, name };
    });
    return { title, slug, date, link: p.link, images, mdName: `${date}-${slug}.md` };
  })
  .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.slug < b.slug ? -1 : 1));

// Guard against filename collisions before writing anything.
const seen = new Map();
for (const r of records) {
  for (const key of [r.mdName, ...r.images.map((i) => i.name)]) {
    if (seen.has(key)) throw new Error(`Filename collision: ${key} (${seen.get(key)} and ${r.slug})`);
    seen.set(key, r.slug);
  }
}
const allImages = records.flatMap((r) => r.images);
console.log(`\nStep 3/4: ${records.length} posts, ${allImages.length} images, no filename collisions`);

// -------------------------------------------------------- Step 5: download images
const SKIP_DOWNLOAD = process.argv.includes('--md-only');
console.log(SKIP_DOWNLOAD ? '\nStep 5: skipped (--md-only)' : '\nStep 5: downloading images...');
let done = 0;
const failures = [];
if (!SKIP_DOWNLOAD)
  await pool(allImages, 6, async (img) => {
    for (let attempt = 1; attempt <= 2; attempt++) {
      const res = await get(img.url, 'buffer');
      if (res.ok && res.body.length > 0) {
        await writeFile(join(IMAGES_DIR, img.name), res.body);
        img.bytes = res.body.length;
        if (++done % 10 === 0) console.log(`  ${done}/${allImages.length}`);
        return;
      }
      if (attempt === 2) failures.push({ name: img.name, url: img.url, status: res.status ?? 'empty body' });
    }
  });
if (!SKIP_DOWNLOAD) console.log(`  downloaded ${done}/${allImages.length}`);
failures.forEach((f) => console.error(`  FAILED ${f.name} (${f.status}) ${f.url}`));

// ------------------------------------------------------- Step 6: generate markdown
console.log('\nStep 6: writing markdown...');
for (const r of records) {
  // The post layout renders the frontmatter `image:` as the hero, so the body
  // carries only images 02+. Single-image posts get an empty body.
  const body = r.images
    .slice(1)
    .map((img) => `![](/assets/images/${img.name})`)
    .join('\n\n');

  const frontmatter =
    `---\n` +
    `layout: post\n` +
    `title: "${r.title.replace(/"/g, '\\"')}"\n` +
    `image: /assets/images/${r.images[0].name}\n` +
    `---\n`;

  await writeFile(join(MARKDOWN_DIR, r.mdName), body ? `${frontmatter}\n${body}\n` : frontmatter, 'utf8'); // utf8, no BOM
}
console.log(`  wrote ${records.length} markdown files`);

// ------------------------------------------------------------------- summary
const totalBytes = allImages.reduce((s, i) => s + (i.bytes || 0), 0);
console.log('\n=== SUMMARY ===');
console.log(`Posts:      ${records.length} markdown files -> ${MARKDOWN_DIR}`);
console.log(`Images:     ${done} files (${(totalBytes / 1048576).toFixed(1)} MB) -> ${IMAGES_DIR}`);
console.log(`Multi-image: ${records.filter((r) => r.images.length > 1).map((r) => `${r.slug}(${r.images.length})`).join(', ') || 'none'}`);
console.log(`Failures:   ${failures.length}`);
console.log('\nNEXT: node _scripts/add-dimensions.mjs   (frontmatter above has no image_width/height yet)');
if (failures.length) process.exitCode = 1;
