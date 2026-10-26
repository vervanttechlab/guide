# Review of provided materials — Palengke Online

Reviewed by: <your name> | Date: <date> | Reported to: Team Leader / assessor

Done **before coding**, by reading `API.md`, sending every request in `api.http`, and studying the mockups and style guide.

## API (from testing with api.http)

| # | Finding | How the front-end handles it |
|---|---|---|
| 1 | Lists and single items are wrapped: `{ data: [...] }` and `{ data: {...} }`; the product list also has `meta` | Read `result.data` and `result.meta` (not the answer itself) |
| 2 | Products carry only `category_id`, not the category name | Load `GET /api/categories` once into a plain object: `categoryNames[id] = name` |
| 3 | `image_url` is a path (`/uploads/x.webp`) on the API server, and is `null` for one product (Suman sa Ibos) | `productImage()` adds `API_BASE`; `null` shows `images/no-image.webp` |
| 4 | `stock: 0` (Calamansi) | Red "Out of stock" badge |
| 5 | Validation errors come as `{ errors: { field: [messages] } }` with status 422 | `showServerErrors()` puts each message under its field |
| 6 | Wrong login = 401 `"Invalid email or password."` (it doesn't say which one was wrong, which is good security) | Shown in a red alert; the password field is cleared |
| 7 | Tokens expire after 8 hours; an expired token gets 401 | Session saved with `expires_at`; a 401 on a protected call clears it and goes to the login page |
| 8 | Sellers can only change their own products (403) | The dashboard only lists your own products; a 403 message is shown if it still happens |
| 9 | The API runs on another port (4000) than Live Server (5500) | CORS is enabled by the API; the CSP allows `http://localhost:4000` in `connect-src` and `img-src` |
| 10 | Photos are uploaded as `multipart/form-data` (field `image`, JPG/PNG/WebP, 2 MB); the server renames them to a UUID; `remove_image=true` removes one | `FormData` without setting `Content-Type`; the same type and size check in the browser before sending; preview with `URL.createObjectURL` (CSP `img-src` needs `blob:`) |
| 11 | Prices are numbers in pesos, without formatting | `formatPeso()` shows `₱1,250.00` |
| 12 | The cart lives on the server and every cart call answers with the whole cart (`items`, `count`, `total`); `POST /api/cart` **adds** to an existing line | After each call redraw the cart from the answer (no maths in the browser); the badge uses `count` |
| 13 | Cart and order endpoints are for customers only (sellers get 403); stock problems come as 422 in `errors.quantity` (cart) or `errors.cart` (checkout) | Sellers get no buy buttons; the messages are shown in a toast / alert and the cart is reloaded |
| 14 | `POST /api/orders` works out the total, lowers the stock and empties the cart | After checkout go to `orders.html?placed=ID`; never send prices or totals from the browser |
| 15 | `/api/seller/products` takes the same options as `/api/products` plus `stock=in/out`, and is paged (8 per page); `/api/seller/summary` totals **all** products | Filters and page buttons on the dashboard; the Vue summary reads `/seller/summary`, not the current page |

## Mockups and style guide

| # | Finding | Decision |
|---|---|---|
| 1 | Mobile shop mockup hides the filters behind a button | Bootstrap `collapse` with `d-lg-block` (always open from 992 px) |
| 2 | Seller table on phones: no Category column, stacked buttons | `d-none d-md-table-cell`; buttons in `flex-column flex-sm-row` |
| 3 | No design for "loading" and "no results" | Added a green spinner and a blue info alert, in the style guide's colours |
| 4 | No design for the delete step | Small confirmation modal, red Delete button (style guide: delete = red) |
| 5 | Pagination colour not specified | Palengke green for the active page, like other main controls |
| 6 | No design for an empty cart or a customer with no orders | A short message with a "Browse products" button |
| 7 | No design for the "added to cart" confirmation | Bootstrap toast at the bottom right (announced to screen readers with `role="status"`) |

Questions sent to the back-end team: none blocking.
