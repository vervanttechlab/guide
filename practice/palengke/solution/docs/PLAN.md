# Project Plan — Palengke Online front-end

Prepared by: <your name> | Submitted to: Project Manager | Date: <date>

## Requirements

**Functional:** FR1 shop list from the API; FR2 search, category, price range, sort, pages; FR3 product details; FR4 register as customer or seller; FR5 log in / log out by role; FR6 seller dashboard listing own products; FR7 add, edit, delete products with a photo upload; FR8 inventory summary (Vue.js); FR9 seller search, category and stock filters with pages; FR10 add to cart (customers); FR11 cart: change quantities, remove items, cart count in the navbar; FR12 checkout with delivery address (cash on delivery); FR13 My orders.

**Non-functional:** responsive (375 / 768 / 1280 px, matching the mockups); WCAG 2.1 AA; Lighthouse performance ≥ 80; secure (validation, XSS-safe output, CSP, token handling, roles); RA 10173 consent; works with the API's documented errors.

## Resources

1 front-end developer; back-end team (API questions); UI/UX designer (mockup questions). VS Code (Live Server, REST Client, ESLint, W3C validator), Node.js (API), Git, Bootstrap 5.3.3 and Vue.js 3 (local copies), Chrome / Edge / Firefox.

## Methodology

Agile, tailored: one 8-hour sprint in small increments, each committed and tested against the mockups and the API. Chosen because the API and the designs are new to us and questions will come up while building.

## Breakdown and schedule

| # | Part | Hours | Start | End |
|---|---|---|---|---|
| 1 | Plan; read API.md; test every endpoint (api.http); review mockups | 0.75 | 8:00 | 8:45 |
| 2 | Shared layout, navbar, `api.js` | 0.5 | 8:45 | 9:15 |
| 3 | Shop page (list, filters, pages, details, add to cart) | 1.25 | 9:15 | 10:30 |
| 4 | Log in and register | 0.5 | 10:30 | 11:00 |
| 5 | Cart, checkout, My orders | 1.0 | 11:00 | 12:00 |
| – | Lunch | | 12:00 | 13:00 |
| 6 | Seller dashboard (CRUD, photo upload, search/filters/pages) + Vue summary | 1.5 | 13:00 | 14:30 |
| 7 | Testing in the test folder; fixes | 0.75 | 14:30 | 15:15 |
| 8 | Security review, risk assessment | 0.25 | 15:15 | 15:30 |
| 9 | Optimisation (minify, Lighthouse) | 0.25 | 15:30 | 15:45 |
| 10 | Documentation | 0.25 | 15:45 | 16:00 |
| | **Total** | **7.0** | | |

Git commit at the end of every part (progress record).

## Testing and acceptance

Test plan in docs/TEST-PLAN.md: functionality, validation, error handling, security (roles, XSS, session), responsiveness, accessibility, cross-browser, performance on a slow API. Accepted when all critical cases pass and the pass rate is at least 90%.
