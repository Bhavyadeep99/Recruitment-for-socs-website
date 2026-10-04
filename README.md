# NSUT Society Recruitment

A notice-board themed site where each NSUT society is a pinned flyer and each role is a tear-off tab. Plain HTML, CSS and JavaScript. No build step.

## Files
- `index.html` page shell and SVG logo sprite
- `app.css` styles
- `app.js` routing, quiz, forms and interactions
- `societies.js` society data (edit this to add or change societies)
- `assets/` put `nsut_logo.png` here; `favicon.svg` is included

## Run locally
Open `index.html` in a browser, or run `python3 -m http.server` in this folder.

## Deploy on GitHub Pages
1. Push all files to a repo, keeping `index.html` at the top level.
2. Settings > Pages > Deploy from a branch > `main` / root.
3. Open the URL GitHub shows after a minute.

## Receive applications
The form runs in demo mode. Set an HTTPS endpoint (for example from Formspree) in `index.html`: `<body data-application-endpoint="https://formspree.io/f/your-id">`.

Student project, not the official NSUT portal.
