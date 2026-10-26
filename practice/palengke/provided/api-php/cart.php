<?php
// The customer's cart: see, add, change the quantity, remove.

// '' when the product can be bought in this quantity; otherwise the reason.
// $product needs 'name' and 'stock' (or is null when the product doesn't exist).
function stock_problem($product, $quantity) {
    if (!$product) {
        return 'A product in your cart is no longer available.';
    }
    if ((int) $product['stock'] === 0) {
        return $product['name'] . ' is out of stock.';
    }
    if ($quantity > (int) $product['stock']) {
        return 'Only ' . $product['stock'] . ' left of ' . $product['name'] . '.';
    }
    return '';
}

// true when a value is a whole number of 1 or more
function is_positive_whole_number($value) {
    return filter_var($value, FILTER_VALIDATE_INT) !== false && (int) $value >= 1;
}

// The cart as the front-end expects it: { items: [...], count, total }
function cart_out($user_id) {
    $rows = select_all(
        'SELECT c.product_id, c.quantity, p.name, p.price, p.image_url, p.stock
         FROM cart_items c JOIN products p ON p.id = c.product_id
         WHERE c.user_id = ? ORDER BY c.id',
        'i', [$user_id]
    );
    $items = [];
    $count = 0;
    $total = 0;
    foreach ($rows as $row) {
        $price = (float) $row['price'];
        $quantity = (int) $row['quantity'];
        $line_total = round($price * $quantity, 2);
        $items[] = [
            'product_id' => (int) $row['product_id'],
            'name' => $row['name'],
            'price' => $price,
            'image_url' => $row['image_url'],
            'stock' => (int) $row['stock'],
            'quantity' => $quantity,
            'line_total' => $line_total,
        ];
        $count = $count + $quantity;
        $total = $total + $line_total;
    }
    return ['items' => $items, 'count' => $count, 'total' => round($total, 2)];
}

// GET /api/cart
function show_cart() {
    $user = require_customer();
    send_json(200, ['data' => cart_out($user['id'])]);
}

// POST /api/cart  { product_id, quantity }: adds to the line when the product is already in the cart
function add_to_cart() {
    $user = require_customer();
    $data = read_json();
    $product = select_one('SELECT * FROM products WHERE id = ?', 'i', [(int) ($data['product_id'] ?? 0)]);
    $quantity = $data['quantity'] ?? 1;
    if (!$product) {
        fail(422, 'The given data was invalid.', ['product_id' => ['The selected product is invalid.']]);
    }
    if (!is_positive_whole_number($quantity)) {
        fail(422, 'The given data was invalid.', ['quantity' => ['The quantity must be a whole number, 1 or more.']]);
    }

    $line = select_one('SELECT quantity FROM cart_items WHERE user_id = ? AND product_id = ?', 'ii', [$user['id'], $product['id']]);
    $already = $line ? (int) $line['quantity'] : 0;
    $wanted = $already + (int) $quantity;
    $problem = stock_problem($product, $wanted);
    if ($problem) {
        fail(422, 'The given data was invalid.', ['quantity' => [$problem]]);
    }

    if ($line) {
        run_query('UPDATE cart_items SET quantity = ? WHERE user_id = ? AND product_id = ?', 'iii', [$wanted, $user['id'], $product['id']]);
    } else {
        run_query('INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)', 'iii', [$user['id'], $product['id'], $wanted]);
    }
    send_json(200, ['message' => 'Added to cart.', 'data' => cart_out($user['id'])]);
}

// PUT /api/cart/:product_id  { quantity }
function update_cart_item($product_id) {
    $user = require_customer();
    $line = select_one('SELECT * FROM cart_items WHERE user_id = ? AND product_id = ?', 'ii', [$user['id'], $product_id]);
    if (!$line) {
        fail(404, 'This product is not in your cart.');
    }
    $data = read_json();
    $quantity = $data['quantity'] ?? null;
    if (!is_positive_whole_number($quantity)) {
        fail(422, 'The given data was invalid.', ['quantity' => ['The quantity must be a whole number, 1 or more.']]);
    }
    $product = select_one('SELECT * FROM products WHERE id = ?', 'i', [$product_id]);
    $problem = stock_problem($product, (int) $quantity);
    if ($problem) {
        fail(422, 'The given data was invalid.', ['quantity' => [$problem]]);
    }
    run_query('UPDATE cart_items SET quantity = ? WHERE id = ?', 'ii', [(int) $quantity, $line['id']]);
    send_json(200, ['message' => 'Cart updated.', 'data' => cart_out($user['id'])]);
}

// DELETE /api/cart/:product_id
function remove_cart_item($product_id) {
    $user = require_customer();
    $line = select_one('SELECT * FROM cart_items WHERE user_id = ? AND product_id = ?', 'ii', [$user['id'], $product_id]);
    if (!$line) {
        fail(404, 'This product is not in your cart.');
    }
    run_query('DELETE FROM cart_items WHERE id = ?', 'i', [$line['id']]);
    send_json(200, ['message' => 'Removed from cart.', 'data' => cart_out($user['id'])]);
}
