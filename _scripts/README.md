# Scripts

Maintenance tooling for this site. Plain Node (18+), no npm dependencies, no
Ruby. Not part of the Jekyll build — `_scripts` is listed under `exclude:` in
`_config.yml`, and Jekyll skips underscore-prefixed directories anyway.

| File | Purpose |
| --- | --- |
| `migrate.mjs` | Import a WordPress category as posts + images |
| `add-dimensions.mjs` | Declare intrinsic image dimensions on every post |
| `verify.mjs` | Lint posts and image assets |
| `image-size.mjs` | Read pixel dimensions from image bytes (shared helper) |

Run from the repo root:

```sh
node _scripts/verify.mjs
```

All three accept `OUT_IMAGES` and `OUT_MARKDOWN` env vars to target directories
other than `assets/images` and `_posts`. `migrate.mjs` also takes `WP_SITE` and
`WP_CATEGORY_ID`.

## Adding a post by hand

Write it as usual, then:

```sh
node _scripts/add-dimensions.mjs   # fills in the dimensions
node _scripts/verify.mjs           # confirms nothing is broken
```

`add-dimensions.mjs` is idempotent — posts that already carry dimensions are
skipped, so re-running it is always safe.

## Migrating another WordPress category

```sh
WP_CATEGORY_ID=7 node _scripts/migrate.mjs
node _scripts/add-dimensions.mjs
node _scripts/verify.mjs
```

`migrate.mjs` writes frontmatter **without** dimensions, so `add-dimensions.mjs`
must run after it. Re-running `migrate.mjs` over existing posts overwrites them
and drops their dimensions — the follow-up puts them back.

Category IDs come from `/wp-json/wp/v2/categories?slug=<slug>`. As of the last
migration: Photos = 5 (31 posts, all imported). Not yet migrated: Videos,
Watching, TBD — 4 posts total, and they are likely video embeds rather than
image galleries, so `migrate.mjs` may need adjusting for them.

## Why it works this way

Three things about the source site break a naive scrape, and each is handled:

- **Images are lazy-loaded.** In the public HTML, `<img src>` is a base64
  placeholder and the real URL lives in `data-src`. Scraping `src` from the page
  yields grey placeholders, so extraction goes through the WordPress REST API,
  whose `content.rendered` is clean.
- **The site logo is an `<img>` on every page.** The REST API returns only post
  body content, which excludes it.
- **Category pagination 404s past the last page.** `migrate.mjs` treats a 404 as
  end-of-pagination and stops.

The category pages are still crawled, purely to assert the URL set matches the
API result. A mismatch aborts the run rather than silently dropping a post.

## Layout shift

Images need `width`/`height` so the browser reserves space before they load.
Both `_layouts/post.html` and `index.html` render a hero `<img>` and guard on
`page.image_width`, so posts without dimensions still render — they just shift.
`verify.mjs` fails if any hero or body image is missing them, or if a declared
size disagrees with the actual file.

Body images use kramdown span IALs rather than raw HTML:

```markdown
![alt](/assets/images/photo.webp){: width="768" height="1024"}
```

The IAL must follow `)` immediately — a space before `{` makes kramdown drop it.

`_sass/_base.scss` sets `height: auto` on `img`, which is required: without it,
`max-width: 100%` combined with a `height` attribute squashes every image.
