# Silvasonic

Source for [silvasonic.com](https://silvasonic.com), a Jekyll site hosted on GitHub Pages.

## Running locally

```bash
bundle install
bundle exec jekyll serve
```

Then open <http://localhost:4000>.

## Layout

- `_posts/`: posts. Images, video and PDFs live in `assets/images/`, named after the post.
- `_layouts/`, `_includes/`: templates. `default.html` holds the masthead and footer.
- `styles.scss`: imports the `_sass/` partials, plus the PDF carousel styles.
- `_sass/_variables.scss`: the Inkblot palette and every design token, with the light theme in
  `:root` and the dark theme under `prefers-color-scheme: dark`. Partials only use the tokens,
  never raw colors.
- `assets/js/pdf-carousel.js`: the slide viewer used by the presentation posts.
- `_scripts/`: migration and image-dimension tooling. See [`_scripts/README.md`](_scripts/README.md).

## Logo files

All in `assets/`:

| File | Use |
| --- | --- |
| `silvasonic-logo-dark.svg` | Fabric blots on an ink tile. Masthead in light mode. |
| `silvasonic-logo-light.svg` | Ink blots on a fabric tile. Masthead in dark mode. |
| `silvasonic-logo-black.svg` | Ink blots, transparent background. |
| `silvasonic-logo-cream.svg` | Fabric blots, transparent background. |
| `favicon.svg`, `favicon.ico`, `apple-touch-icon-precomposed.png` | Browser and home-screen icons, from the dark logo. |

## Credits

Built on [Poole](https://github.com/poole/poole) by Mark Otto. The code is MIT-licensed; posts,
images, PDFs and logos are all rights reserved. See [LICENSE.md](LICENSE.md).
