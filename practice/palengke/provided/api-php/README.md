# Palengke Online API — PHP + MySQL version (XAMPP)

The same API as `api-server/` (Node.js), written in plain PHP with MySQL: `mysqli` functions, no PDO, no framework. The endpoints, JSON and error messages are the same (see `../API.md`), so the same front-end works with both.

## Install on XAMPP

1. **Start XAMPP:** open the XAMPP control panel (macOS: *manager-osx*; Windows: *xampp-control*) and start **Apache** and **MySQL**.
2. **Copy this folder** into XAMPP's `htdocs` and name it `palengke-api`:
   - macOS: `/Applications/XAMPP/xamppfiles/htdocs/palengke-api`
   - Windows: `C:\xampp\htdocs\palengke-api`
3. **macOS only:** let Apache save uploaded photos:
   ```
   chmod 777 /Applications/XAMPP/xamppfiles/htdocs/palengke-api/uploads
   ```
4. **Create the database:** open <http://localhost/phpmyadmin> → **Import** → choose `database.sql` → **Import**. Or in a terminal:
   ```
   /Applications/XAMPP/xamppfiles/bin/mysql -u root < database.sql      (macOS)
   C:\xampp\mysql\bin\mysql -u root < database.sql                       (Windows)
   ```
   Importing it again resets everything to the sample data.
5. **Check:** <http://localhost/palengke-api/api/health> shows `{"status":"ok",…}`.
6. **Front-end:** in `solution/js/api.js` use the PHP line:
   ```js
   const API_BASE = 'http://localhost/palengke-api';
   ```

Sample accounts: `juan@example.com` / `Customer123` (customer), `maria@example.com` / `Seller123` and `pedro@example.com` / `Seller123` (sellers).

## The files

| File | What it does |
|---|---|
| `.htaccess` | Sends every request to `index.php` (except real files like photos) and passes the `Authorization` header to PHP |
| `index.php` | The router: reads the address and method (e.g. `GET products/3`) and calls the matching function |
| `config.php` | Database login and settings; opens the connection (`mysqli_connect`) |
| `helpers.php` | `send_json()`, `fail()`, `read_json()`; `run_query()` / `select_all()` / `select_one()` for safe queries; `current_user()`, `require_seller()`, `require_customer()`; tokens; UUIDs and photo checks |
| `auth.php` | register, login, logout, me |
| `categories.php` | list of categories |
| `products.php` | list (search, filters, sort, pages), details, the seller's products (same filters plus `stock=in/out`), the seller's summary, add, edit, delete |
| `cart.php` | the customer's cart: see it, add, change a quantity, remove |
| `orders.php` | checkout (turns the cart into an order inside a **transaction**), the customer's orders, one order |
| `database.sql` | Creates the database, the 7 tables (`users`, `tokens`, `categories`, `products`, `cart_items`, `orders`, `order_items`) and the sample data |
| `uploads/` | Product photos (samples, plus uploads named `<uuid>.jpg/png/webp`) |

## How it stays simple and still safe

- **Safe queries:** every value goes through a `?` placeholder with `mysqli_prepare` + `mysqli_stmt_bind_param` (inside `run_query()`), never glued into the SQL, so typed text can't change the query (no SQL injection).
- **Passwords:** stored with `password_hash()` and checked with `password_verify()`, never stored as plain text.
- **Tokens:** `bin2hex(random_bytes(32))`, saved in the `tokens` table with an expiry time; logout deletes the row.
- **Photos:** `getimagesize()` reads the file itself, so a renamed text file is refused; 2 MB limit; saved as `uuid_v4() . '.jpg'` with `move_uploaded_file()`; the old file is deleted when a photo is replaced, removed, or its product is deleted.
- **Editing with a photo:** PHP only reads uploaded files (`$_FILES`) on **POST**, so the front-end sends `POST /api/products/:id` with a field `_method=PUT`. `index.php` treats that as PUT.
- **Errors:** any PHP or database error answers `500 {"message":"Server error."}`; the details go to Apache's error log, not to the visitor.
- **Checkout in one piece:** `orders.php` uses `mysqli_begin_transaction()`, then `UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?` for each item. If any row isn't updated (someone bought it first), `mysqli_rollback()` undoes everything; otherwise `mysqli_commit()` saves the order, its items, the new stock and the empty cart together.
- **Prices from the database:** the order's prices and total are read from the `products` table, never taken from the browser.
- **Numbers:** MySQL returns numbers as text, so `product_out()` turns `id`, `price`, `stock`… back into numbers with `(int)` / `(float)`.

One small difference from the Node version: this version also accepts numbers sent as text in JSON (e.g. `"price": "70"`).

## Quick test without Apache

PHP's built-in server can run it too (useful on a machine without XAMPP's Apache):
```
cd api-php
php -S localhost:8000 index.php
```
Then use `http://localhost:8000/api/health`, and `const API_BASE = 'http://localhost:8000';` in the front-end (also add `http://localhost:8000` to the pages' Content Security Policy).
