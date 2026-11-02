# Repository Audit: old-cookie.github.io

## What this repo does

This is a static GitHub Pages portfolio hosting four independent vanilla-JS web apps:
- **index.html** — landing page linking to the four apps
- **WaterMark** — upload images, add a cherry watermark SVG, export as PNG
- **Soup** — Sea Turtle Soup puzzle library, data from a Google Sheet XLSX
- **AvatarPreview** — upload photo, crop circle, export 3000×3000 PNG
- **LYWSD02ClockSync** — Bluetooth time sync for Xiaomi LYWSD02 clock

Per AGENTS.md: No build step, no package manager, no tests, no CI. Apps load third-party libs from CDNs.

## Assumed load

These are single-user, event-driven web tools. One person at a time uses each app. No server-side state, no background workers (beyond `setInterval` for the clock display). The Soup app fetches data from a Google Sheet on every page load/navigate.

---

## Must fix

| # | Title | File:Lines | What this is | Problem | Fix | If we skip it |
|---|-------|-----------|--------------|---------|-----|---------------|
| 1 | **`debounce` is undefined, breaking Soup search** | `Soup/soup.js:292` | `const debouncedFilter = debounce(...` | The `debounce` function is referenced but never defined in the repo. At DOMContentLoad, `bindGlobalEventListeners()` calls `debounce(...)` which throws `ReferenceError`. The entire search functionality (debounced keystroke filtering, clear button, escape key) crashes on page load. | Add a minimal `debounce` implementation before its first use, e.g.:<br>`function debounce(fn, wait) { let t; return (...args) => clearTimeout(t) || (t = setTimeout(() => fn(...args), wait)) }` | Search remains broken; users can't search, can't use Escape to return to list, can't clear the search field. |
| 2 | **`addTextWatermark` is undefined, crashes image processing** | `WaterMark/WaterMark.js:61` | `wm.onerror = () => { addTextWatermark(ctx, finalCanvas); ... }` | When the watermark SVG (`Cherryneko_Watermark_WithNameXUsername.svg`) fails to load, `compositeImage` falls into the `wm.onerror` path, which calls the undefined `addTextWatermark`. This throws `ReferenceError`, rejecting the `compositeImage` promise. The user gets an alert and the entire processing hangs/crashes. | Define `addTextWatermark(ctx, canvas)` as a simple fallback: draw text "SAMPLE" or the filename across the canvas, e.g. `ctx.fillText("SAMPLE", 10, 20);` | Users cannot process images when the watermark SVG fails (e.g., ad-block, network error). Every upload is at risk of failure. |
| 3 | **`Intl()` called as function, throws in LYWSD02ClockSync** | `LYWSD02ClockSync/LYWSD02ClockSync.js:147` | `const localeOpts = { timeZone: Intl().resolvedOptions().timeZone, ... }` | `Intl` is a JavaScript built-in **object**, not a callable function. `Intl()` throws `TypeError: Intl is not a function`. This means the "Update time" button will always fail with an uncaught error, making the Bluetooth sync non-functional. | Change to `Intl.DateTimeFormat().resolvedOptions().timeZone` or remove the timeZone override and use the default locale: `const localeOpts = {};` | The clock sync always fails; the "Enable Experimental Web Platform features" flag and Bluetooth setup are wasted effort because the time payload can never be generated. |

---

## Should fix

| # | Title | File:Lines | What this is | Problem | Fix | If we skip it |
|---|-------|-----------|--------------|---------|-----|---------------|
| 4 | **WaterMark `compositeImage` sets `img.src` before `onerror`/`onload`** | `WaterMark/WaterMark.js:41-42` | `const img = new Image(); img.src = imageDataURL; img.onerror = ...` | Classic race condition: `src` is set *before* the error/load handlers are attached. If the image data URL resolves synchronously (e.g., cached image), the `load` event may fire before `onload` is attached, and the handler is never called. Similarly, `onerror` may miss the error. | Move handler attachment *before* `img.src = imageDataURL`:<br>`img.onerror = ...; img.onload = ...; img.src = imageDataURL;` | Rare but possible: a cached image load is silently missed, and the user gets no error or unexpected behavior. |
| 5 | **WaterMark watermark caching + handler overwriting hangs on failure** | `WaterMark/WaterMark.js:14-30` | `let _wmImage = null; function getWatermarkImage()` with cached `Image` object. When `checkWatermarkExists` sets `wm.onerror` (resolves false on failure), the cached image ends up with `complete=true, naturalWidth=0`. Then `compositeImage` overwrites `onerror`/`onload` with new handlers that never fire (image already completed with error), so the promise **never resolves** → the app hangs silently. | Preserve the original `onerror`/`onload` or check `wm.complete` / `wm.naturalWidth` before overwriting. If the image already completed with error, use the text fallback immediately instead of setting new handlers. | Users who experience a watermark SVG load failure get a permanently hanging app — no error, no result, just a blank screen. The only "fix" is force-refresh. |
| 6 | **Dead `clear-search` code in Soup** | `Soup/soup.js:281-318` | `clearButton` references, `clearButton.style.display`, `clearButton.addEventListener("click")` | The `soup.html` HTML has no element with `id="clear-search"`. The `clearButton` is always `null`, so all `clearButton` guards (`if (clearButton)`) prevent execution, but the code still references `clearButton.style.display` and `if (clearButton) { ... }` patterns that are dead. The search clear-UX simply doesn't exist in the UI. | Remove the `clearButton` references entirely (or add a `clear-search` button to `soup.html`). | Dead code sits in the app; not critical but violates lean principles and could confuse future maintainers. |
| 7 | **Dead `updateUnit` function in LYWSD02ClockSync** | `LYWSD02ClockSync/LYWSD02ClockSync.js:43-61` | `function updateUnit()` with `TIME_SERVICE`/`UNIT` constants and UI logic | `updateUnit` is never called from the HTML form. The form only has `onsubmit="updateTime(); return false;"`. The `UNIT` constant and the entire `updateUnit` function are unused. | Remove `updateUnit`, `UNIT` constant, and the `getCharecteristics` call for unit (or keep if future-proofing). | Unused code blooms the file and conceptually misleads about the app's capabilities. |
| 8 | **No SRI hashes on any CDN scripts** | `index.html`, `WaterMark/WaterMark.html`, `Soup/soup.html`, `LYWSD02ClockSync/LYWSD02ClockSync.html`, `AvatarPreview/AvatarPreview.html` | All third-party libs (Blades CSS, marked, Cropper.js, SheetJS, etc.) load from CDNs without `integrity` attributes. | If a CDN is compromised or disappears, all apps break silently or load broken scripts. No integrity verification. | Add `integrity` and `crossorigin` attributes to every `<script src="...">` from external CDNs. This is a non-trivial change because it requires knowing the correct hashes and possibly adjusting CORS. | Apps remain vulnerable to CDN failures or supply-chain attacks. Low probability but high impact. |
| 9 | **Soup fetches Google Sheet XLSX on every page navigate** | `Soup/soup.js:73`, `Soup/soupDetail.js:52` | `loadSoupData()` / `loadSoupFromUrl()` each independently `fetch(SOUP_DATA_URL)` | Every time a user navigates to `soup.html` or `soupDetail.html?<title>`, a new XLSX fetch occurs. No caching between pages. Rapid navigations cause redundant network requests and flickering loading skeletons. | Add a module-level cache: `let cachedXhr = null; if (cachedXhr) return cachedXhr;` or store the parsed `soupData` and reuse it. | Users experience unnecessary wait times and flashy skeleton screens on every nav. Not critical for single-page use but wasteful. |

---

## Nice to have

| # | Title | File:Lines | What this is | Problem | Fix | If we skip it |
|---|-------|-----------|--------------|---------|-----|---------------|
| 10 | **`soup.js` `debounce` referenced but not defined** (duplicate of Must-fix #1, but noted as "nice" if you prefer a lighter touch) | `Soup/soup.js:292` | Same as Must-fix #1 | The search functionality is broken at page load. | Add the `debounce` helper. | Same as Must-fix #1. |
| 11 | **`escapeHtml` duplicated in both `soup.js` and `soupDetail.js`** | `Soup/soup.js:250`, `Soup/soupDetail.js:259` | Identical 3-line `escapeHtml` function in both files. AGENTS.md notes it stays duplicated because pages load independently and have no shared module. | Code duplication. Not a bug, but violates lean principles. | Leave as-is (per AGENTS.md guidance: "moving it to a shared file would add an import dependency"). | Duplication persists; minor code bloat. |
| 12 | **AvatarPreview uses unpinned Cropper.js v2 from unpkg** | `AvatarPreview/AvatarPreview.html:50` | `<script src="https://unpkg.com/cropperjs@2.0.0/dist/cropper.min.js">` | No version pinning beyond `2.0.0`. If unpkg changes the `2.0.0` tag, the API could break (the code uses v2 web-component API: `getCropperSelection`, `$toCanvas`). | Pin to a specific commit hash or use a fixed unpkg tag with monitoring. | Risk of Cropper.js breaking silently at a future date. |
| 13 | **WaterMark `processImages` replaces all images on every upload** | `WaterMark/File.js:39`, `WaterMark/WaterMark.js:70-98` | After processing, `imagesContainer.innerHTML = ""` clears the container. Previous uploads' results are lost. Users uploading in batches only keep the last batch. | UX issue: multi-batch uploads don't accumulate. | Store `editedImages` persistently (e.g., in `localStorage`) or render preview without clearing the source container. | Users can't build up a collection of watermarked images across multiple uploads. |
| 14 | **No server-side fallback for Soup data** | `Soup/soup.html`, `Soup/soupDetail.html` | Entire app depends on a live Google Sheet. No offline data, no static backup. | If the Sheet is deleted, edited, or the network is unavailable, the app shows an error state with a "Reload" button. | Host a static JSON copy of the XLSX data in the repo, or add a "download XLSX" fallback. | Users lose access to all puzzles if the Google Sheet disappears. |

---

## Summary verdict

**Must fix first** — three critical bugs that break core functionality:
1. `debounce` undefined breaks Soup search
2. `addTextWatermark` undefined crashes WaterMark processing
3. `Intl()` as function throws in LYWSD02ClockSync, making time sync impossible

**Lean improvements** — remove dead code and reduce bundle risk:
- Remove dead `clear-search` references and `updateUnit` function
- Add SRI hashes to CDN scripts
- Cache Soup XLSX fetches

**Checked**: All four app directories, `AGENTS.md`, `README.md`, all `.js`, `.html`, `.css` files, and inline scripts. The `assets/` subdirectories were verified for the Watermark SVG and clock icon.

**Not checked**: The LYWSD02ClockSync Bluetooth hardware interaction (requires real hardware + Chrome/Edge + experimental flag — per AGENTS.md it cannot be tested headlessly). The Google Sheets XLSX structure/format (data is hosted externally). Cropper.js v2 behavior with extreme image sizes.

**Total lines across all source files**: ~1600 lines of JavaScript/CSS/HTML across 5 apps. **-8 lines, -2 dependencies possible** from removing the `updateUnit` function and dead `clear-search` code. The `debounce` addition adds ~4 lines.