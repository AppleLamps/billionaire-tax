# Billionaire Tax Act Viewer

Single-page reader for the 2026 Billionaire Tax Act text with a fixed layout,
scrollable bill panel, and table of contents.

## Files

- `index.html` - main page markup
- `styles.css` - layout and theme styles
- `script.js` - bill parsing and rendering
- `billionaires tax.txt` - source text used to render the bill

## Run

Modern browsers block `fetch()` when opening `index.html` directly from disk. Use a local server instead:

```bash
python -m http.server
```

Then open `http://localhost:8000`. If you still open the file directly, the app will prompt you to load the text file manually.
