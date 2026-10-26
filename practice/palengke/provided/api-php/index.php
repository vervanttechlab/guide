<?php
// Palengke Online REST API (PHP + MySQL version).
// Every request comes to this file (see .htaccess), which picks the function to run.

// Only for PHP's built-in test server (php -S): serve real files like uploads/mango.webp directly
if (php_sapi_name() === 'cli-server' && is_file(__DIR__ . parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH))) {
    return false;
}

// CORS: let a front-end on another address (e.g. Live Server on port 5500) call this API
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('X-Content-Type-Options: nosniff');

require __DIR__ . '/helpers.php';

// The browser asks "may I?" (OPTIONS) before some requests: answer yes, with no body
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    send_json(204);
}

try {
    require __DIR__ . '/config.php';   // also connects to the database
    require __DIR__ . '/auth.php';
    require __DIR__ . '/categories.php';
    require __DIR__ . '/products.php';
    require __DIR__ . '/cart.php';
    require __DIR__ . '/orders.php';

    // The part of the address after "/api/", split into pieces: "products/3" -> ['products', '3']
    $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    $start = strpos($path, '/api/');
    if ($start === false) {
        fail(404, 'Not found. All endpoints start with /api.');
    }
    $route = explode('/', trim(substr($path, $start + 5), '/'));
    $method = $_SERVER['REQUEST_METHOD'];
    $count = count($route);
    $id = $count >= 2 ? (int) $route[1] : 0;

    // A form can't send PUT with a file in PHP, so it sends POST with _method=PUT
    if ($method === 'POST' && ($_POST['_method'] ?? '') === 'PUT') {
        $method = 'PUT';
    }

    // ----- Routes -----
    if ($method === 'GET' && $route[0] === 'health') {
        send_json(200, ['status' => 'ok', 'time' => date('c')]);
    }

    if ($route[0] === 'auth' && $count === 2) {
        if ($method === 'POST' && $route[1] === 'register') register();
        if ($method === 'POST' && $route[1] === 'login') login();
        if ($method === 'POST' && $route[1] === 'logout') logout();
        if ($method === 'GET' && $route[1] === 'me') me();
    }

    if ($route[0] === 'categories' && $method === 'GET') {
        if ($count === 1) list_categories();
        if ($count === 3 && $route[2] === 'products') {
            if (!select_one('SELECT id FROM categories WHERE id = ?', 'i', [$id])) {
                fail(404, 'Category not found.');
            }
            list_products($id);
        }
    }

    if ($route[0] === 'products') {
        if ($method === 'GET' && $count === 1) list_products();
        if ($method === 'GET' && $count === 2) show_product($id);
        if ($method === 'POST' && $count === 1) create_product();
        if ($method === 'PUT' && $count === 2) update_product($id);
        if ($method === 'DELETE' && $count === 2) delete_product($id);
    }

    if ($route[0] === 'seller' && $count === 2 && $method === 'GET') {
        if ($route[1] === 'products') seller_products();
        if ($route[1] === 'summary') seller_summary();
    }

    if ($route[0] === 'cart') {
        if ($method === 'GET' && $count === 1) show_cart();
        if ($method === 'POST' && $count === 1) add_to_cart();
        if ($method === 'PUT' && $count === 2) update_cart_item($id);
        if ($method === 'DELETE' && $count === 2) remove_cart_item($id);
    }

    if ($route[0] === 'orders') {
        if ($method === 'GET' && $count === 1) list_orders();
        if ($method === 'GET' && $count === 2) show_order($id);
        if ($method === 'POST' && $count === 1) place_order();
    }

    fail(404, "No endpoint for $method $path.");
} catch (Throwable $error) {
    // Details go to the server's error log, never to the visitor
    error_log($error->getMessage());
    fail(500, 'Server error.');
}
