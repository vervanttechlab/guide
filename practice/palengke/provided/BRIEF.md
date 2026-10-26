# Practical task: Palengke Online front-end

**Qualification:** Web Development (Front-End) NC III · **Time:** 8 hours · **Internet:** first 15 minutes only

## Situation

Palengke Online is a local marketplace. Customers browse produce from local sellers; sellers list and manage their own products. The back-end team has finished the REST API (`api-server/`, documented in `API.md`). The UI/UX designer has finished the mockups (`mockups/`) and the style guide (`STYLE-GUIDE.md`). There is no front-end yet.

## Your task

Build the front-end so it **looks like the mockups** and **works with the provided API**.

1. **Plan:** write a short project plan: requirements (functional and non-functional), methodology, task breakdown with time estimates, testing parameters.
2. **Version control:** use Git from the start; commit after each part. Clone your repository into a separate testing folder for testing.
3. **Pages** (responsive: phones 375 px, tablets 768 px, desktops 1280 px):
   - **Shop** (`index.html`): product list from the API with search, category, price range, sort and pages; product details.
   - **Log in** and **Register** (customer or seller).
   - **Cart** (customers only): add products from the shop (cards and details window), change quantities, remove items; a cart count in the navbar.
   - **Checkout**: delivery address and notes, place the order (cash on delivery).
   - **My orders** (customers only): all the customer's orders, newest first, with their items and totals.
   - **Seller dashboard** (sellers only): inventory totals; the seller's products with **search, category and stock filters and pages**; add, edit and delete products, including **uploading a product photo** (the API stores it under a UUID file name).
4. **Integration:** use every endpoint in `API.md` that the pages need. Send the token on protected calls. Show the API's error messages (wrong login, validation errors per field, no permission) in a friendly way.
5. **JavaScript framework:** use a framework from the CBC list for at least one part of the front-end.
6. **Security:** validate input, prevent XSS, add a Content Security Policy, protect the token, and handle roles and expired logins. Write a risk assessment.
7. **Performance:** optimise images, minify the files for release, measure with Lighthouse.
8. **Testing:** a test plan with test cases and results (pass rate, mean/median/mode of load times).
9. **Documentation:** a README covering target audience, scope, system architecture, installation, features, API endpoints, code comments and diagrams.

## Provided

| File | What it is |
|---|---|
| `api-server/` | The REST API. Start with `node server.js` (no install needed). |
| `API.md` | API documentation from the back-end team |
| `api.http` | Example requests for the VS Code REST Client extension |
| `mockups/*.png` | Designs: desktop and mobile |
| `STYLE-GUIDE.md` | Colours, fonts, components |

## Sample accounts

Customer: `juan@example.com` / `Customer123` · Sellers: `maria@example.com` / `Seller123`, `pedro@example.com` / `Seller123`
