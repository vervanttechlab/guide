<?php
// Small functions used by every endpoint: JSON answers, database queries, the logged-in user, photos.

// ---------- JSON answers ----------

// Sends a JSON answer with an HTTP status code, then stops the script.
function send_json($status, $data = null) {
    http_response_code($status);
    if ($data !== null) {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    }
    exit;
}

// Sends an error, e.g. fail(404, 'Product not found.') or fail(422, '...', ['name' => ['...']]).
function fail($status, $message, $errors = null) {
    $body = ['message' => $message];
    if ($errors) {
        $body['errors'] = $errors;
    }
    send_json($status, $body);
}

// Reads a JSON request body into an array.
function read_json() {
    $raw = file_get_contents('php://input');
    if ($raw === '') {
        return [];
    }
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        fail(400, 'Request body must be valid JSON.');
    }
    return $data;
}

// ---------- Database ----------

// Runs a query safely. The values go in separately from the SQL (a prepared statement),
// so text typed by users can never change the SQL (no SQL injection).
// $types has one letter per value: s = text, i = whole number, d = decimal number.
// Example: run_query('DELETE FROM products WHERE id = ?', 'i', [5]);
function run_query($sql, $types = '', $values = []) {
    global $conn;
    $stmt = mysqli_prepare($conn, $sql);
    if ($types !== '') {
        mysqli_stmt_bind_param($stmt, $types, ...$values);
    }
    mysqli_stmt_execute($stmt);
    return $stmt;
}

// Returns all rows of a SELECT as arrays, e.g. [['id' => 1, 'name' => 'Vegetables'], ...].
function select_all($sql, $types = '', $values = []) {
    $result = mysqli_stmt_get_result(run_query($sql, $types, $values));
    return mysqli_fetch_all($result, MYSQLI_ASSOC);
}

// Returns the first row of a SELECT, or null when there is none.
function select_one($sql, $types = '', $values = []) {
    $rows = select_all($sql, $types, $values);
    return $rows ? $rows[0] : null;
}

// ---------- Logged-in user ----------

// The token from the "Authorization: Bearer <token>" header, or null.
function bearer_token() {
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? ($_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '');
    if ($header === '' && function_exists('getallheaders')) {
        foreach (getallheaders() as $name => $value) {
            if (strtolower($name) === 'authorization') {
                $header = $value;
            }
        }
    }
    return preg_match('/^Bearer\s+([a-f0-9]{64})$/i', $header, $match) ? $match[1] : null;
}

// Finds the user who owns the token (if it hasn't expired), or returns null.
function current_user() {
    $token = bearer_token();
    if (!$token) {
        return null;
    }
    return select_one(
        'SELECT users.* FROM tokens JOIN users ON users.id = tokens.user_id
         WHERE tokens.token = ? AND tokens.expires_at > ?',
        'ss', [$token, date('Y-m-d H:i:s')]
    );
}

// Stops with 401 or 403 unless a seller is logged in; returns the seller.
function require_seller() {
    $user = current_user();
    if (!$user) {
        fail(401, 'Unauthenticated.');
    }
    if ($user['role'] !== 'seller') {
        fail(403, 'This action is for sellers only.');
    }
    return $user;
}

// Stops with 401 or 403 unless a customer is logged in; returns the customer.
function require_customer() {
    $user = current_user();
    if (!$user) {
        fail(401, 'Unauthenticated.');
    }
    if ($user['role'] !== 'customer') {
        fail(403, 'This action is for customers only.');
    }
    return $user;
}

// The user fields that may be sent to the browser (never the password hash).
function public_user($user) {
    return [
        'id' => (int) $user['id'],
        'name' => $user['name'],
        'email' => $user['email'],
        'role' => $user['role'],
        'created_at' => $user['created_at'],
    ];
}

// Creates a random login token for a user and saves it.
function issue_token($user) {
    global $TOKEN_HOURS;
    $token = bin2hex(random_bytes(32));                       // 64 random hexadecimal characters
    $expires = time() + $TOKEN_HOURS * 3600;
    run_query('INSERT INTO tokens (token, user_id, expires_at) VALUES (?, ?, ?)',
        'sis', [$token, $user['id'], date('Y-m-d H:i:s', $expires)]);
    return ['token' => $token, 'token_type' => 'Bearer', 'expires_at' => date('c', $expires)];
}

// ---------- Photos ----------

// A random UUID (version 4), e.g. "3f2c9a1e-7b4d-4c1a-9e2f-5a6b7c8d9e0f".
function uuid_v4() {
    $bytes = random_bytes(16);
    $bytes[6] = chr((ord($bytes[6]) & 0x0f) | 0x40);   // version 4
    $bytes[8] = chr((ord($bytes[8]) & 0x3f) | 0x80);   // variant
    $hex = bin2hex($bytes);
    return substr($hex, 0, 8) . '-' . substr($hex, 8, 4) . '-' . substr($hex, 12, 4) . '-'
         . substr($hex, 16, 4) . '-' . substr($hex, 20, 12);
}

// Checks the uploaded "image" file. Returns an error message, or '' when it is fine (or not sent).
function check_image() {
    global $MAX_IMAGE_BYTES;
    if (!isset($_FILES['image']) || $_FILES['image']['error'] === UPLOAD_ERR_NO_FILE) {
        return '';
    }
    $file = $_FILES['image'];
    if ($file['error'] === UPLOAD_ERR_INI_SIZE || $file['error'] === UPLOAD_ERR_FORM_SIZE || $file['size'] > $MAX_IMAGE_BYTES) {
        return 'The image may not be larger than 2 MB.';
    }
    if ($file['error'] !== UPLOAD_ERR_OK) {
        return 'The image could not be uploaded.';
    }
    // getimagesize() reads the file itself, so a text file renamed to .jpg is refused
    $info = @getimagesize($file['tmp_name']);
    if (!$info || !in_array($info['mime'], ['image/jpeg', 'image/png', 'image/webp'])) {
        return 'The image must be a JPG, PNG or WebP file.';
    }
    return '';
}

// Saves the uploaded "image" as uploads/<uuid>.<ext> and returns its path, or null when none was sent.
function save_image() {
    if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
        return null;
    }
    $extensions = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
    $mime = getimagesize($_FILES['image']['tmp_name'])['mime'];
    $name = uuid_v4() . '.' . $extensions[$mime];
    move_uploaded_file($_FILES['image']['tmp_name'], __DIR__ . '/uploads/' . $name);
    return '/uploads/' . $name;
}

// Deletes an uploaded photo. Only UUID files are deleted, never the sample photos.
function delete_image($image_url) {
    if ($image_url && preg_match('#^/uploads/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$#', $image_url)) {
        $path = __DIR__ . $image_url;
        if (is_file($path)) {
            unlink($path);
        }
    }
}
