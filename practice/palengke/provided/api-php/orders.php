<?php
// Checkout and the customer's orders.

// One order as the front-end expects it, with its items.
function order_out($order) {
    $rows = select_all('SELECT product_id, name, price, quantity FROM order_items WHERE order_id = ? ORDER BY id', 'i', [$order['id']]);
    $items = [];
    foreach ($rows as $row) {
        $price = (float) $row['price'];
        $quantity = (int) $row['quantity'];
        $items[] = [
            'product_id' => $row['product_id'] === null ? null : (int) $row['product_id'],
            'name' => $row['name'],
            'price' => $price,
            'quantity' => $quantity,
            'line_total' => round($price * $quantity, 2),
        ];
    }
    return [
        'id' => (int) $order['id'],
        'address' => $order['address'],
        'notes' => $order['notes'],
        'status' => $order['status'],
        'total' => (float) $order['total'],
        'created_at' => date('c', strtotime($order['created_at'])),   // e.g. 2026-10-05T11:15:00+08:00
        'items' => $items,
    ];
}

// GET /api/orders: the customer's orders, newest first
function list_orders() {
    $user = require_customer();
    $orders = select_all('SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC', 'i', [$user['id']]);
    send_json(200, ['data' => array_map('order_out', $orders)]);
}

// GET /api/orders/:id
function show_order($id) {
    $user = require_customer();
    $order = select_one('SELECT * FROM orders WHERE id = ? AND user_id = ?', 'ii', [$id, $user['id']]);
    if (!$order) {
        fail(404, 'Order not found.');
    }
    send_json(200, ['data' => order_out($order)]);
}

// POST /api/orders  { address, notes }: checkout.
// The prices and the total come from the database, never from the browser.
function place_order() {
    global $conn;
    $user = require_customer();
    $data = read_json();
    $address = trim($data['address'] ?? '');
    $notes = trim($data['notes'] ?? '');

    $errors = [];
    if (mb_strlen($address) < 5 || mb_strlen($address) > 200) {
        $errors['address'] = ['The delivery address must be 5 to 200 characters.'];
    }
    if (mb_strlen($notes) > 200) {
        $errors['notes'] = ['The notes may not be longer than 200 characters.'];
    }
    $lines = select_all(
        'SELECT c.product_id, c.quantity, p.name, p.price, p.stock
         FROM cart_items c JOIN products p ON p.id = c.product_id
         WHERE c.user_id = ? ORDER BY c.id',
        'i', [$user['id']]
    );
    if (!$lines) {
        $errors['cart'] = ['Your cart is empty.'];
    }
    foreach ($lines as $line) {
        $problem = stock_problem($line, (int) $line['quantity']);
        if ($problem) {
            $errors['cart'] = [$problem];
            break;
        }
    }
    if ($errors) {
        fail(422, 'The given data was invalid.', $errors);
    }

    $total = 0;
    foreach ($lines as $line) {
        $total = $total + round((float) $line['price'] * (int) $line['quantity'], 2);
    }

    // A transaction: the order, its items, the stock changes and emptying the cart
    // are saved together, or (if anything fails) none of them is saved.
    mysqli_begin_transaction($conn);
    run_query('INSERT INTO orders (user_id, address, notes, total) VALUES (?, ?, ?, ?)',
        'issd', [$user['id'], $address, $notes, round($total, 2)]);
    $order_id = mysqli_insert_id($conn);

    foreach ($lines as $line) {
        // Lower the stock only if there is still enough (another customer may have just bought some)
        $stmt = run_query('UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?',
            'iii', [$line['quantity'], $line['product_id'], $line['quantity']]);
        if (mysqli_stmt_affected_rows($stmt) !== 1) {
            mysqli_rollback($conn);
            fail(422, 'The given data was invalid.', ['cart' => ['Only ' . $line['stock'] . ' left of ' . $line['name'] . '.']]);
        }
        run_query('INSERT INTO order_items (order_id, product_id, name, price, quantity) VALUES (?, ?, ?, ?, ?)',
            'iisdi', [$order_id, $line['product_id'], $line['name'], $line['price'], $line['quantity']]);
    }
    run_query('DELETE FROM cart_items WHERE user_id = ?', 'i', [$user['id']]);
    mysqli_commit($conn);

    $order = select_one('SELECT * FROM orders WHERE id = ?', 'i', [$order_id]);
    send_json(201, ['message' => 'Order placed.', 'data' => order_out($order)]);
}
