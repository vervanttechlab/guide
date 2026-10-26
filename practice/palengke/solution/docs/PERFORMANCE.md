# Performance — Palengke Online front-end

Tester: <your name> | Date: <date>

## What was optimised

| Item | How | Where |
|---|---|---|
| Product photos | WebP, about 600 × 450 px, 11 photos = 88 KB in total; `width`/`height` set; `loading="lazy"` on cards | API `uploads/`; `shop.js` |
| Placeholder image | one small WebP (6 KB) for products without a photo | `images/no-image.webp` |
| Upload limit | photos over 2 MB are refused (browser and API), so no huge files reach the shop | `seller.js` `checkImage()`; API |
| Bootstrap and Vue | the minified (`.min`) files, kept locally in `vendor/` so they load without internet | `vendor/` |
| Vue only where needed | Vue loads on the seller dashboard only, not on the shop | `seller.html` |
| Scripts | `defer` on every script, so the page shows before JavaScript runs | all pages |
| Minification | `release.sh` / `release.ps1` minify HTML, CSS and JavaScript into `release/` | `release/` |
| Paging | the API sends 8 products per page, not all of them | `?page=` on `/api/products` and `/api/seller/products` |

## Minification results (measured)

| Files | Before (bytes) | After (bytes) | Smaller by |
|---|---|---|---|
| HTML (6 pages) | 35,619 | 28,543 | 20% |
| JavaScript (8 files) | 62,516 | 30,461 | 51% |
| CSS | 2,496 | 1,845 | 26% |

Tested: the minified copy in `release/` passes the same browser test as the original (shop, cart, checkout, orders, seller dashboard), with 0 console errors.

## Lighthouse (fill in after measuring)

Chrome DevTools → Lighthouse → Mobile. Measure the shop page on Live Server (before) and on `http://localhost:8081` after `http-server release -p 8081` (after), with the API running.

| Score | Before | After |
|---|---|---|
| Performance | | |
| Accessibility | | |
| Best practices | | |
| Total transfer size (KB) | | |
| Largest Contentful Paint (s) | | |

## Load times for the test plan (5 runs, seconds)

| Run | 1 | 2 | 3 | 4 | 5 | Mean | Median | Mode |
|---|---|---|---|---|---|---|---|---|
| Shop page | | | | | | | | |
