# Risk Assessment — Palengke Online front-end

Scope: six pages (shop, log in, register, cart and checkout, my orders, seller dashboard), login session, calls to the REST API. Assets: customer and seller accounts (names, emails), tokens, product data, orders (delivery addresses), the sellers' reputation.

Score = Likelihood × Impact (1–3 each): 6–9 High, 3–4 Medium, 1–2 Low.

| Threat | L | I | Score | Control | Where |
|---|---|---|---|---|---|
| XSS through product names or descriptions written by sellers | 2 | 3 | 6 | Output encoding; CSP without inline scripts or eval | `textContent` everywhere; Vue render function; CSP meta on every page |
| Token theft (an XSS could read sessionStorage) | 2 | 3 | 6 | No XSS (above); sessionStorage (cleared when the tab closes) instead of localStorage; token expiry; logout ends the token on the server | `api.js` session functions; `POST /api/auth/logout` |
| Customer reaching seller functions | 2 | 3 | 6 | UI hides seller links **and** the API answers 403; the page redirects non-sellers | `requireRole('seller')`; server checks every request |
| Seller changing another seller's product | 2 | 3 | 6 | API checks ownership (403); the dashboard lists only own products | `/api/seller/products`; 403 shown as a message |
| Weak passwords / account takeover | 2 | 3 | 6 | Password rules in the form and on the server; generic login error | `register.js`; API 422 / 401 |
| Personal data misuse (RA 10173) | 2 | 3 | 6 | Consent on register; only name, email and role collected | `register.html` consent checkbox |
| Malicious file upload (a script renamed to .jpg, huge files, file names like `../../server.js`) | 2 | 3 | 6 | Browser checks type and size; the server checks the file's first bytes, limits size (2 MB image, 3 MB request) and saves under a random UUID name, never the user's file name | `checkImage()` in seller.js; API `imageExtension()`, `saveImage()` |
| Price tampering (changing prices or totals in the browser before checkout) | 2 | 3 | 6 | The browser never sends prices or totals; the server reads prices from its own data and works out the total | `POST /api/orders` sends only `{ address, notes }` |
| Overselling (two customers buy the last items at the same time) | 2 | 2 | 4 | The server checks the stock again at checkout; the PHP version lowers stock with `WHERE stock >= ?` inside a transaction | `errors.cart` shown in `cart.js`; `orders.php` |
| A customer seeing another customer's orders or address | 1 | 3 | 3 | The API returns only the logged-in customer's orders (others give 404); addresses are shown only on My orders | `GET /api/orders`; `requireRole('customer')` |
| Open redirect after login | 1 | 2 | 2 | `?next=` accepted only for our own `.html` pages | `login.js` `safeNext` |
| Interception of tokens | 2 | 3 | 6 | HTTPS in production (TLS); never put the token in a URL | Deployment requirement; token only in the `Authorization` header |
| Information leakage | 1 | 2 | 2 | Friendly messages; details only in the console | `catch` blocks, `ApiError` |

Back-end phase recommendations: rate-limit login attempts; refresh tokens or HttpOnly cookie sessions; resize uploaded photos on the server and scan uploads.

Monitoring and review: re-assess at every release. Reported to: Team Leader.
