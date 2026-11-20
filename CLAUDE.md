# CLAUDE.md

Personal blog (Jekyll on GitHub Pages). See [README.md](README.md) for layout and local setup.

## Git

- Commit and push straight to `master`. No feature branches, no pull requests.
- `master` is what GitHub Pages builds; a push publishes.
- Don't commit `Gemfile.lock` (removed on purpose).

## Posts

- `_posts/YYYY-MM-DD-slug.md`, front matter `layout: post` and a title-case `title`.
- Section headings in a post are bold lines (`**Heading**`), not `##`.
- Run `node _scripts/verify.mjs` before pushing.
