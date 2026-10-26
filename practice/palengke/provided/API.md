# Palengke Online REST API — documentation for the front-end team

Prepared by: Back-end team · Version 1.0

## Start the server

```
cd api-server
node server.js
```

The API runs at **`http://localhost:4000/api`**. It needs only Node.js, with no `npm install`.

- `node server.js --reset` restores the original sample data.
- `node server.js --slow` delays every response by 1 second, to test loading states.

## Conventions

- Requests and responses are JSON. Send `Content-Type: application/json` with every request that has a body.
- **Protected endpoints** need the header `Authorization: Bearer <token>`. The token comes from login or register and is valid for 8 hours.
- Lists are wrapped: `{ "data": [ ... ] }`. The product list also has `meta` (pagination).
- Single items are wrapped too: `{ "data": { ... } }`.
- CORS is enabled for all origins, so a page on Live Server (`http://127.0.0.1:5500`) can call the API.
- Product images: `image_url` is a path like `/uploads/mango.webp`. Load it from the API server: `http://localhost:4000/uploads/mango.webp`. `image_url` can be `null`, in which case show your own placeholder.
- **Photo upload:** add and edit accept `multipart/form-data` with an `image` file (see below). The server saves it under a random **UUID** name, e.g. `/uploads/3f2c9a1e-7b4d-4c1a-9e2f-5a6b7c8d9e0f.jpg`.
- Prices are in pesos (numbers). `stock` is a whole number; `0` means out of stock.

## Errors

| Status | Meaning | Body |
|---|---|---|
| 400 | Body is not valid JSON | `{ "message": "Request body must be valid JSON." }` |
| 401 | No token, a wrong or expired token, or a wrong login | `{ "message": "Unauthenticated." }` or `{ "message": "Invalid email or password." }` |
| 403 | Logged in, but not allowed (wrong role, or not your product) | `{ "message": "This action is for sellers only." }` |
| 404 | Not found | `{ "message": "Product not found." }` |
| 413 | Request larger than 3 MB | `{ "message": "Request body too large (max 3 MB)." }` |
| 422 | Validation failed | `{ "message": "The given data was invalid.", "errors": { "field": ["message"] } }` |
| 500 | Server error | `{ "message": "Server error." }` |

## Sample accounts

| Name | Email | Password | Role |
|---|---|---|---|
| Juan Dela Cruz | juan@example.com | Customer123 | customer |
| Maria Santos | maria@example.com | Seller123 | seller |
| Pedro Reyes | pedro@example.com | Seller123 | seller |

## Endpoints

### Authentication

| Method | Endpoint | Auth | Body | Success |
|---|---|---|---|---|
| POST | `/api/auth/register` | – | `{ name, email, password, role }` (role: `customer` or `seller`) | 201 `{ message, token, token_type, expires_at, user }` |
| POST | `/api/auth/login` | – | `{ email, password }` | 200 `{ message, token, token_type, expires_at, user }` |
| GET | `/api/auth/me` | Bearer | – | 200 `{ data: user }` |
| POST | `/api/auth/logout` | Bearer | – | 200 `{ message }` (the token stops working) |

Register rules: name 2–60 characters; a valid email that isn't already used; password at least 8 characters with a letter and a number.

`user` = `{ id, name, email, role, created_at }`

### Categories

| Method | Endpoint | Auth | Success |
|---|---|---|---|
| GET | `/api/categories` | – | 200 `{ data: [ { id, name } ] }` |
| GET | `/api/categories/:id/products` | – | Same as `/api/products?category_id=:id` (accepts the same query options) |

### Products (everyone)

| Method | Endpoint | Auth | Success |
|---|---|---|---|
| GET | `/api/products` | – | 200 `{ data: [product], meta: { page, limit, total, total_pages } }` |
| GET | `/api/products/:id` | – | 200 `{ data: product }`, 404 if missing |

Query options for `GET /api/products` (all optional, combine freely):

| Option | Example | Meaning |
|---|---|---|
| `search` | `?search=rice` | Text in the name or description (ignores capitals) |
| `category_id` | `?category_id=2` | Only one category |
| `min_price`, `max_price` | `?min_price=50&max_price=100` | Price range in pesos |
| `sort` | `?sort=price_asc` | `newest` (default), `price_asc`, `price_desc`, `name` |
| `page`, `limit` | `?page=2&limit=8` | Pagination (limit 1–50, default 8) |

`product` = `{ id, name, description, price, stock, category_id, image_url, seller_id, seller_name, created_at, updated_at }`

Note: products carry `category_id` only. Get the category names from `/api/categories`.

### Products (sellers only)

All need `Authorization: Bearer <token>` of a **seller**. A customer gets 403; no token gets 401.

| Method | Endpoint | Body | Success | Errors |
|---|---|---|---|---|
| GET | `/api/seller/products` | – | 200 `{ data: [product], meta }`: only your own products, paged (see below) | 401, 403 |
| GET | `/api/seller/summary` | – | 200 `{ data: { products, units, stock_value, out_of_stock } }`: totals over **all** your products | 401, 403 |
| POST | `/api/products` | multipart/form-data (below) **or** JSON `{ name, price, stock, category_id, description? }` | 201 `{ message, data: product }` | 401, 403, 413, 422 |
| PUT | `/api/products/:id` | same as POST (send all fields) | 200 `{ message, data: product }` | 401, 403 (not yours), 404, 413, 422 |
| POST | `/api/products/:id` with field `_method=PUT` | multipart/form-data, same fields | same as PUT | same as PUT |
| DELETE | `/api/products/:id` | – | 200 `{ message }` | 401, 403 (not yours), 404 |

`GET /api/seller/products` accepts the same query options as `GET /api/products` (`search`, `category_id`, `min_price`, `max_price`, `sort`, `page`, `limit`) plus **`stock`**: `in` (stock above 0) or `out` (stock 0). Example: `/api/seller/products?search=rice&stock=in&sort=name&page=1`.

Product rules: name 3–80 characters; price a number greater than 0; stock a whole number, 0 or more; `category_id` must exist; description up to 500 characters.

### Uploading a photo (multipart/form-data)

Send the product as form fields, plus the photo as a file field named **`image`**:

| Field | Value |
|---|---|
| `name`, `price`, `stock`, `category_id`, `description` | text (numbers are converted by the server) |
| `image` | optional file: **JPG, PNG or WebP, up to 2 MB**. The server checks the file's contents, not just its name. |
| `remove_image` | PUT only, optional: `true` removes the current photo |

- The server stores the file as **`<uuid>.<jpg|png|webp>`** (a random UUID, never the original file name) and returns it in `image_url`.
- **Editing with a form:** send `POST /api/products/:id` with an extra field `_method=PUT`. (PHP only reads uploaded files on POST, so this "method override" is the standard way; the API treats it exactly like PUT.)
- PUT with a new `image` replaces the photo (the old file is deleted). PUT without `image` keeps the current photo.
- DELETE removes the product's uploaded photo too.
- Errors: 422 `{ "errors": { "image": ["The image must be a JPG, PNG or WebP file."] } }` or `["The image may not be larger than 2 MB."]`; 413 if the whole request is over 3 MB.

In the browser, send a `FormData` object with `fetch` and **do not set `Content-Type` yourself**; the browser adds `multipart/form-data` with the boundary.

### Cart (customers only)

All need `Authorization: Bearer <token>` of a **customer**. A seller gets 403 `{ "message": "This action is for customers only." }`; no token gets 401. Each customer has one cart, saved on the server.

| Method | Endpoint | Body | Success | Errors |
|---|---|---|---|---|
| GET | `/api/cart` | – | 200 `{ data: cart }` | 401, 403 |
| POST | `/api/cart` | `{ product_id, quantity }` (quantity optional, default 1). If the product is already in the cart, the quantity is **added** to it. | 200 `{ message, data: cart }` | 401, 403, 422 |
| PUT | `/api/cart/:product_id` | `{ quantity }` (the new quantity, 1 or more) | 200 `{ message, data: cart }` | 401, 403, 404 (not in your cart), 422 |
| DELETE | `/api/cart/:product_id` | – | 200 `{ message, data: cart }` | 401, 403, 404 |

`cart` = `{ items: [ { product_id, name, price, image_url, stock, quantity, line_total } ], count, total }`. `count` is the number of units (for a cart badge); `total` is in pesos.

Cart errors (422): `{ "errors": { "product_id": ["The selected product is invalid."] } }`, `{ "errors": { "quantity": ["The quantity must be a whole number, 1 or more."] } }`, `["Only 18 left of Bangus (1 kg)."]` or `["Calamansi (1/2 kg) is out of stock."]`.

### Orders (customers only)

| Method | Endpoint | Body | Success | Errors |
|---|---|---|---|---|
| POST | `/api/orders` | `{ address, notes? }` | 201 `{ message, data: order }` | 401, 403, 422 |
| GET | `/api/orders` | – | 200 `{ data: [order] }`: your orders, newest first | 401, 403 |
| GET | `/api/orders/:id` | – | 200 `{ data: order }` | 401, 403, 404 (not yours or missing) |

**`POST /api/orders` is the checkout.** It turns the whole cart into an order: the server works out the prices and the total (never trust a total sent by the browser), lowers each product's stock, and empties the cart. Payment is cash on delivery, so `status` is `placed`.

Checkout rules: address 5–200 characters; notes up to 200 characters. If the cart is empty or a product no longer has enough stock, nothing is saved and you get 422 with `errors.cart`, e.g. `{ "errors": { "cart": ["Only 5 left of Bangus (1 kg)."] } }`.

`order` = `{ id, address, notes, status, total, created_at, items: [ { product_id, name, price, quantity, line_total } ] }`. The items keep the name and price **at the time of the order**, so later product changes don't alter old orders.

## Example

```
POST /api/auth/login
Content-Type: application/json

{ "email": "maria@example.com", "password": "Seller123" }
```

```
200 OK
{
  "message": "Logged in successfully.",
  "token": "5f0c…(64 characters)",
  "token_type": "Bearer",
  "expires_at": "2026-10-26T16:00:00.000Z",
  "user": { "id": 2, "name": "Maria Santos", "email": "maria@example.com", "role": "seller", "created_at": "2026-10-01T09:00:00.000Z" }
}
```
