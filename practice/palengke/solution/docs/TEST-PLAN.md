# Test Plan — Palengke Online front-end

Tester: <your name> | Reviewer: Team Leader | Distributed to: Project Manager, Team Leader, Back-end team | Date: <date>

**Objective:** confirm every page works with the provided API, matches the mockups, and handles errors and roles safely.
**Environment:** a clone of the repository in a testing folder, served with Live Server; the API on port 4000 started with `node server.js --reset`; Chrome, Edge, Firefox; 375 / 768 / 1280 px.
**Schedule:** prepare 10 min · execute 45 min · fix and retest 15 min.

| ID | Parameter | Steps | Expected | Actual | Pass/Fail |
|---|---|---|---|---|---|
| T01 | Functionality | Open the shop | 8 cards, "12 products", 5 categories, pages 1–2 | | |
| T02 | Functionality | Search "rice" | 4 products (Suman, Bibingka, Brown Rice, Dinorado) | | |
| T03 | Functionality | Category Seafood | Tilapia and Bangus | | |
| T04 | Functionality | Sort price low to high | Kangkong ₱25.00 first | | |
| T05 | Validation | Min 200, max 100 | Max field red, no request sent | | |
| T06 | Functionality | Price 50–100 | 5 products | | |
| T07 | Data handling | Look at Suman sa Ibos and Calamansi | "No image" placeholder; "Out of stock" badge | | |
| T08 | Functionality | View details | Modal with name, price, stock, description, seller | | |
| T09 | Error handling | Log in with a wrong password | "Invalid email or password." | | |
| T10 | Functionality | Log in as maria (seller) | Goes to My products; navbar shows name and Seller badge | | |
| T11 | Functionality | Add Talong ₱70, stock 10 | New row; summary 7 / 253 / ₱20,920.00 | | |
| T12 | Functionality | Edit it: ₱75.50, stock 0 | Row shows ₱75.50 and "Out of stock"; summary out of stock = 1 | | |
| T13 | Functionality | Delete it, confirm | Row gone; "Deleted Talong (1 kg)." | | |
| T14 | Security (roles) | Log in as juan (customer), open seller.html | Sent to the login page | | |
| T15 | Security (session) | Log out, then press Back | No token in sessionStorage; seller page sends you to login | | |
| T16 | Validation (server) | Register with juan@example.com | "The email has already been taken." under Email | | |
| T17 | Functionality | Register a new seller | Goes to an empty seller dashboard | | |
| T18 | Security (XSS) | Add a product named `<img src=x onerror=alert(1)>` | Shown as text; nothing runs | | |
| T19 | Error handling | Stop the API, reload the shop | "Cannot reach the server…" alert, no blank page | | |
| T20 | Performance | Start the API with `--slow` | Spinner shows while loading | | |
| T21 | Responsiveness | 375 / 768 / 1280 px | Matches mockups 01–13 | | |
| T22 | Accessibility | Keyboard only; Lighthouse | All controls reachable; modals trap focus; score ≥ 90 | | |
| T23 | Cross-browser | Chrome, Edge, Firefox | Same layout and behaviour | | |
| T24 | Functionality (upload) | Add a product with a PNG photo | Preview before saving; after saving the table shows the photo from `/uploads/<uuid>.png` | | |
| T25 | Validation (upload) | Choose a .txt file; then a photo over 2 MB | "Choose a JPG, PNG or WebP image." / "…not be larger than 2 MB." (nothing uploaded) | | |
| T26 | Functionality (upload) | Edit the product, tick "Remove the current photo" | Placeholder shown; the UUID file is deleted on the server | | |
| T27 | Functionality (cart) | As juan, click Add to cart on Kangkong | Toast "Added 1 × Kangkong (1 bundle) to your cart."; navbar Cart badge 1 | | |
| T28 | Validation (cart) | Details of Bibingka, quantity 50, Add to cart | "Only 20 in stock." under the box; nothing added | | |
| T29 | Security (roles) | As a visitor click Add to cart; as maria open the shop and cart.html | Visitor goes to login; seller sees no Add to cart buttons and cart.html sends her to login | | |
| T30 | Functionality (cart) | In the cart change Kangkong to 3, then remove Bibingka | Line total and Total update; badge updates; "Removed Bibingka (2 pcs) from your cart." | | |
| T31 | Validation (server) | Change Kangkong to 999 | "Only 120 left of Kangkong (1 bundle)."; the box goes back to the old quantity | | |
| T32 | Validation | Place order with an empty address | Address field red with its message; no request sent | | |
| T33 | Functionality (checkout) | Place order with an address and notes | Goes to My orders with "Thank you! Your order #2 has been placed…"; badge 0; cart empty; Kangkong stock lowered | | |
| T34 | Functionality (orders) | Open My orders | Orders newest first, each with items, address, notes and total (order #1 = ₱390.00) | | |
| T35 | Functionality (seller filters) | As maria search "rice"; then category Seafood; then stock "Out of stock" | Bibingka + Dinorado Rice; Bangus; "0 products" with the "No products match" note | | |
| T36 | Functionality (seller pages) | Add 3 products (9 in all), go to page 2, delete its only row | Page 1 shows 8 rows, page 2 one; after the delete the table goes back to page 1 and the summary updates | | |

Critical cases: T01, T09, T10, T11, T12, T13, T14, T16, T18, T24, T27, T33, T35.

## Results

- Passed: __ / 36 → pass rate = passed ÷ 36 × 100 = __ %
- Shop load times (s), 5 runs: __ → mean __, median __, mode __
- Decision: accepted if all critical cases pass and the pass rate is at least 90%.
