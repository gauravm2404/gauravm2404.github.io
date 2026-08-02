# Dr. Gaurav Maggu — personal site

A static, dependency-free personal/academic site. No build step: it is plain HTML, CSS and
vanilla JavaScript, so GitHub Pages serves it directly from the repository root.

## Structure

```
index.html            all page content
css/styles.css        design system + layout + motion primitives
js/publications.js    the 23-entry bibliography (edit this to add papers)
js/main.js            scroll choreography, filters, nav
assets/portrait.jpg   hero portrait
.nojekyll             tells GitHub Pages to serve files as-is
```

## Editing

- **Add a publication** — append an object to the array in `js/publications.js`.
  Available `tags` are `first`, `ai`, `child`, `meta`, `award`; they drive the filter chips.
  Remember to update the count on the "All" chip in `index.html` if you add entries.
- **Change text** — everything else lives directly in `index.html`, section by section
  (each section is marked with a comment banner).
- **Colours and type** — the tokens at the top of `css/styles.css` (`:root`) control the
  whole palette, the type scale and the corner radii.

## Local preview

```bash
python -m http.server 5173 --directory .
```

Then open <http://localhost:5173>.

## Deploying to GitHub Pages

1. Push this folder to a GitHub repository.
2. Repository → **Settings** → **Pages** → Source: *Deploy from a branch*,
   Branch: `main`, Folder: `/ (root)`.
3. The site goes live at `https://<username>.github.io/<repo>` — or at
   `https://<username>.github.io` if the repository is named `<username>.github.io`.

### Custom domain

Add a file named `CNAME` at the root containing just the domain (e.g. `gauravmaggu.com`),
then point a `CNAME` DNS record at `<username>.github.io`.

## Accessibility & performance notes

- All motion is gated behind `prefers-reduced-motion`.
- A print stylesheet strips the chrome so the page prints as a clean CV.
- No trackers, no analytics, no third-party JavaScript. The only external request is to
  Google Fonts.
