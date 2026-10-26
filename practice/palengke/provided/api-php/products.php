<?php
// Products: public list and details; sellers add, edit and delete their own products (with photos).

// Turns a database row into the JSON the front-end expects (numbers as numbers, not text).
function product_out($row) {
    return [
        'id' => (int) $row['id'],
        'name' => $row['name'],
        'description' => $row['description'],
        'price' => (float) $row['price'],
        'stock' => (int) $row['stock'],
        'category_id' => (int) $row['category_id'],
        'image_url' => $row['image_url'],
        'seller_id' => (int) $row['seller_id'],
        'seller_name' => $row['seller_name'],
        'created_at' => $row['created_at'],
        'updated_at' => $row['updated_at'],
    ];
}

// The product columns plus the seller's name
$PRODUCT_SELECT = 'SELECT p.*, u.name AS seller_name FROM products p JOIN users u ON u.id = p.seller_id';

// GET /api/products?search=&category_id=&min_price=&max_price=&stock=&sort=&page=&limit=
// (also GET /api/categories/:id/products, which passes the category id,
//  and GET /api/seller/products, which passes the seller's id)
function list_products($category_id = null, $seller_id = null) {
    global $PRODUCT_SELECT;
    $stock = $_GET['stock'] ?? '';   // '' = all, 'in' = in stock, 'out' = out of stock
    $search = trim($_GET['search'] ?? '');
    $category_id = $category_id ?? ($_GET['category_id'] ?? '');
    $min = $_GET['min_price'] ?? '';
    $max = $_GET['max_price'] ?? '';
    $sort = $_GET['sort'] ?? 'newest';
    $page = max(1, (int) ($_GET['page'] ?? 1));
    $limit = min(50, max(1, (int) ($_GET['limit'] ?? 8)));

    // Only these sort orders are allowed (an ORDER BY can't use a ? placeholder)
    $sorts = [
        'newest' => 'p.created_at DESC, p.id DESC',
        'price_asc' => 'p.price ASC, p.id ASC',
        'price_desc' => 'p.price DESC, p.id ASC',
        'name' => 'p.name ASC',
    ];
    if (!isset($sorts[$sort])) {
        fail(422, 'The given data was invalid.', ['sort' => ['sort must be newest, price_asc, price_desc or name.']]);
    }
    if ($stock !== '' && $stock !== 'in' && $stock !== 'out') {
        fail(422, 'The given data was invalid.', ['stock' => ['stock must be in or out.']]);
    }
    if (($min !== '' && !is_numeric($min)) || ($max !== '' && !is_numeric($max))) {
        fail(422, 'The given data was invalid.', ['price' => ['min_price and max_price must be numbers.']]);
    }

    // Build the WHERE part from the filters that were sent
    $where = [];
    $types = '';
    $values = [];
    if ($search !== '') {
        $where[] = '(p.name LIKE ? OR p.description LIKE ?)';
        $types .= 'ss';
        $values[] = '%' . $search . '%';
        $values[] = '%' . $search . '%';
    }
    if ($category_id !== '') {
        $where[] = 'p.category_id = ?';
        $types .= 'i';
        $values[] = (int) $category_id;
    }
    if ($min !== '') {
        $where[] = 'p.price >= ?';
        $types .= 'd';
        $values[] = (float) $min;
    }
    if ($max !== '') {
        $where[] = 'p.price <= ?';
        $types .= 'd';
        $values[] = (float) $max;
    }
    if ($seller_id !== null) {
        $where[] = 'p.seller_id = ?';
        $types .= 'i';
        $values[] = $seller_id;
    }
    if ($stock === 'in') {
        $where[] = 'p.stock > 0';
    }
    if ($stock === 'out') {
        $where[] = 'p.stock = 0';
    }
    $where_sql = $where ? 'WHERE ' . implode(' AND ', $where) : '';

    // Total for the pages, then just the products of this page
    $total = (int) select_one("SELECT COUNT(*) AS total FROM products p $where_sql", $types, $values)['total'];
    $rows = select_all("$PRODUCT_SELECT $where_sql ORDER BY {$sorts[$sort]} LIMIT ? OFFSET ?",
        $types . 'ii', array_merge($values, [$limit, ($page - 1) * $limit]));

    send_json(200, [
        'data' => array_map('product_out', $rows),
        'meta' => ['page' => $page, 'limit' => $limit, 'total' => $total, 'total_pages' => max(1, (int) ceil($total / $limit))],
    ]);
}

// GET /api/products/:id
function show_product($id) {
    global $PRODUCT_SELECT;
    $row = select_one("$PRODUCT_SELECT WHERE p.id = ?", 'i', [$id]);
    if (!$row) {
        fail(404, 'Product not found.');
    }
    send_json(200, ['data' => product_out($row)]);
}

// GET /api/seller/products  (seller): only the seller's own products,
// with the same search, filters and pages as GET /api/products
function seller_products() {
    $user = require_seller();
    list_products(null, (int) $user['id']);
}

// GET /api/seller/summary  (seller): totals over ALL the seller's products
function seller_summary() {
    $user = require_seller();
    $row = select_one(
        'SELECT COUNT(*) AS products, COALESCE(SUM(stock), 0) AS units,
                COALESCE(SUM(price * stock), 0) AS stock_value, COALESCE(SUM(stock = 0), 0) AS out_of_stock
         FROM products WHERE seller_id = ?',
        'i', [$user['id']]
    );
    send_json(200, ['data' => [
        'products' => (int) $row['products'],
        'units' => (int) $row['units'],
        'stock_value' => (float) $row['stock_value'],
        'out_of_stock' => (int) $row['out_of_stock'],
    ]]);
}

// Reads the product fields from a form (multipart/form-data, with a photo) or from JSON.
function read_product_input() {
    $is_form = stripos($_SERVER['CONTENT_TYPE'] ?? '', 'multipart/form-data') === 0;
    return $is_form ? $_POST : read_json();
}

// Checks the product fields and the photo. Returns the errors (an empty array when all is fine).
function validate_product($data) {
    $errors = [];
    $name = trim($data['name'] ?? '');
    if (mb_strlen($name) < 3 || mb_strlen($name) > 80) {
        $errors['name'] = ['The name must be 3 to 80 characters.'];
    }
    $price = $data['price'] ?? '';
    if (!is_numeric($price) || $price <= 0) {
        $errors['price'] = ['The price must be a number greater than 0.'];
    }
    if (filter_var($data['stock'] ?? '', FILTER_VALIDATE_INT) === false || $data['stock'] < 0) {
        $errors['stock'] = ['The stock must be a whole number, 0 or more.'];
    }
    $category_id = $data['category_id'] ?? '';
    if (!is_numeric($category_id) || !select_one('SELECT id FROM categories WHERE id = ?', 'i', [(int) $category_id])) {
        $errors['category_id'] = ['The selected category is invalid.'];
    }
    if (mb_strlen($data['description'] ?? '') > 500) {
        $errors['description'] = ['The description may not be longer than 500 characters.'];
    }
    $image_error = check_image();
    if ($image_error) {
        $errors['image'] = [$image_error];
    }
    return $errors;
}

// POST /api/products  (seller)
function create_product() {
    global $conn, $PRODUCT_SELECT;
    $user = require_seller();
    $data = read_product_input();
    $errors = validate_product($data);
    if ($errors) {
        fail(422, 'The given data was invalid.', $errors);
    }

    $image_url = save_image();   // null when no photo was sent
    run_query(
        'INSERT INTO products (name, description, price, stock, category_id, image_url, seller_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
        'ssdiisi',
        [trim($data['name']), trim($data['description'] ?? ''), (float) $data['price'], (int) $data['stock'],
         (int) $data['category_id'], $image_url, $user['id']]
    );
    $row = select_one("$PRODUCT_SELECT WHERE p.id = ?", 'i', [mysqli_insert_id($conn)]);
    send_json(201, ['message' => 'Product created.', 'data' => product_out($row)]);
}

// PUT /api/products/:id with JSON, or POST /api/products/:id with _method=PUT (form with a photo).
// PHP only reads uploaded files on POST, which is why forms use _method=PUT.
function update_product($id) {
    global $PRODUCT_SELECT;
    $user = require_seller();
    $product = select_one('SELECT * FROM products WHERE id = ?', 'i', [$id]);
    if (!$product) {
        fail(404, 'Product not found.');
    }
    if ((int) $product['seller_id'] !== (int) $user['id']) {
        fail(403, 'You can only change your own products.');
    }
    $data = read_product_input();
    $errors = validate_product($data);
    if ($errors) {
        fail(422, 'The given data was invalid.', $errors);
    }

    // A new photo replaces the old one; remove_image=true removes it; otherwise keep it
    $image_url = $product['image_url'];
    $new_image = save_image();
    if ($new_image) {
        delete_image($image_url);
        $image_url = $new_image;
    } elseif (($data['remove_image'] ?? '') === 'true' || ($data['remove_image'] ?? false) === true) {
        delete_image($image_url);
        $image_url = null;
    }

    run_query(
        'UPDATE products SET name = ?, description = ?, price = ?, stock = ?, category_id = ?, image_url = ?, updated_at = NOW() WHERE id = ?',
        'ssdiisi',
        [trim($data['name']), trim($data['description'] ?? ''), (float) $data['price'], (int) $data['stock'],
         (int) $data['category_id'], $image_url, $id]
    );
    $row = select_one("$PRODUCT_SELECT WHERE p.id = ?", 'i', [$id]);
    send_json(200, ['message' => 'Product updated.', 'data' => product_out($row)]);
}

// DELETE /api/products/:id  (seller, own product): the photo file is deleted too
function delete_product($id) {
    $user = require_seller();
    $product = select_one('SELECT * FROM products WHERE id = ?', 'i', [$id]);
    if (!$product) {
        fail(404, 'Product not found.');
    }
    if ((int) $product['seller_id'] !== (int) $user['id']) {
        fail(403, 'You can only change your own products.');
    }
    delete_image($product['image_url']);
    run_query('DELETE FROM products WHERE id = ?', 'i', [$id]);
    send_json(200, ['message' => 'Product deleted.']);
}
