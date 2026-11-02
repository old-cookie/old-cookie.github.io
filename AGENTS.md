# AGENTS.md

Static GitHub Pages portfolio: one landing page plus independent vanilla-JS apps. No build, package manager, tests, lint, or CI. Do not add them unless asked.

## Verification

- Serve the repo root over HTTP, e.g. `python -m http.server 8000`, then open `http://localhost:8000`.
- Do not test WaterMark or AvatarPreview exports via `file://`; canvas `toDataURL` can fail on locally loaded images. Use the HTTP server.
- Otherwise verify manually in a browser. LYWSD02 needs Chrome/Edge, Web Bluetooth, the experimental-platform flag, and real hardware; it cannot be tested headlessly.

## Layout

- `index.html` is the authoritative project list. `README.md` can lag behind it (its WaterMark link points to a nonexistent root `WaterMark.html`).
- Apps are self-contained directories: `AvatarPreview/`, `WaterMark/`, `Soup/`, `LYWSD02ClockSync/`. There is no shared JS/CSS between them.
- Live URLs are `/<dir>/<page>.html`. GitHub Pages is case-sensitive; keep asset names and casing exact (some contain spaces; HTML uses `%20`).
- Third-party libraries load from CDNs. SheetJS is pinned to 0.20.3; Blades CSS tracks major v3; marked and Cropper.js are unpinned. Treat version changes as compatibility work.
- Blades CSS is a Pico fork: markup (`.container`, `.grid`, `role="button"`, `data-tooltip`) is unchanged and its CSS variables are still named `--pico-*`, so keep those names in app CSS.
- Blades' `.grid` makes one column per child, so the landing page uses `.project-grid` (inline `<style>` in `index.html`) for a readable card width and equal-height cards.
- Blades' `img:not([height]) { max-width: 100% }` out-specifies one-class selectors. Size images with `img.your-class` or higher specificity (see `LYWSD02ClockSync.css`).
- Files are UTF-8; some keep a BOM. Do not rewrite HTML/CSS with PowerShell `Get-Content`/`Set-Content` — on a Big5 Windows it silently mangles CJK text. Use the edit tool or explicit `UTF8Encoding`.

## Soup

- Puzzle data is not in the repo. `soup.html` and `soupDetail.js` fetch a published Google Sheet as XLSX at runtime.
- Sheet headers are exact Chinese names: `湯名`, `類型`, `規則`, `主持人手冊`, `湯面`, `湯底`, `其他資料`, `AI 生成?`. The AI flag is literally `是`; the README's `Yes`/`No` wording is wrong.
- XLSX parsing shared in `Soup/xlsx.js` (imported by both `soup.html` and `soupDetail.html`); `soup.js` and `soupDetail.js` call `parseXLSX`/`convertXLSXToSoupData` from there.
- Detail routing is `soupDetail.html?<urlencoded title>` using the first query key, not `?title=`. `decodeURIComponent` removed — `URLSearchParams` already decodes, so titles containing `%` no longer throw; fix both pages together if changed.
- Puzzle Markdown is rendered with `marked` and `sanitize: true` (XSS guard strips HTML). Titles and user-facing text are escaped with `escapeHtml` (defined once per page, shared nowhere).
- `soupAdd.html` only embeds a Google Form; there is no server-side submission code.

## WaterMark

- Script order at the end of `<body>` is required: `State.js` caches DOM nodes, then `File.js`, `UI.js`, and `WaterMark.js` use those globals. Moving them to `<head>` or changing order breaks startup.
- `File.js` allows 10 images, matching `UI_updateProcessButton`; uploader hides at 10.
- Skeleton cards: `renderListSkeletonCards(count = 3)` in `Soup/soup.js:20` matches the 3 static cards in `soup.html`; the JS default was 6, causing a layout jump on load.
- Duplicate `escapeHtml`: present in both `Soup/soup.js` and `Soup/soupDetail.js` (3 lines each). Since pages load independently and have no shared module, it stays duplicated; moving it to a shared file would add an import dependency.
- The watermark is `assets/Cherryneko_Watermark_WithNameXUsername.svg`; if it fails to load, a text watermark is used instead.
- "Download all" staggers each file by 500 ms.

## AvatarPreview

- Uses the Cropper.js v2 web-component API from unpkg (`getCropperSelection`, `$toCanvas`), not the v1 API.
- Export is a square 3000×3000 PNG. The circle is only a CSS overlay (`.circle-overlay`); it is not applied to the exported image. Do not "fix" this unless asked.
- The file input has `multiple`, but only `files[0]` is used.
- Upload markup uses `.upload-card` (matches `AvatarPreview.css`), fixing the previous `.upload-area` mismatch.

## LYWSD02ClockSync

- Requires a secure context and Web Bluetooth; it will not work from `file://`.
- Time payload is 5 bytes: uint32 Unix seconds little-endian, then timezone hours. 30/45-minute offsets are folded into the seconds. Keep the service/characteristic UUIDs and this encoding unless the device protocol is being changed.
