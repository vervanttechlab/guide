<?php
// Register, log in, log out, and "who am I".

// POST /api/auth/register  { name, email, password, role }
function register() {
    $data = read_json();
    $name = trim($data['name'] ?? '');
    $email = strtolower(trim($data['email'] ?? ''));
    $password = $data['password'] ?? '';
    $role = $data['role'] ?? '';

    $errors = [];
    if (mb_strlen($name) < 2 || mb_strlen($name) > 60) {
        $errors['name'] = ['The name must be 2 to 60 characters.'];
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $errors['email'] = ['The email must be a valid email address.'];
    } elseif (select_one('SELECT id FROM users WHERE email = ?', 's', [$email])) {
        $errors['email'] = ['The email has already been taken.'];
    }
    if (strlen($password) < 8 || !preg_match('/[A-Za-z]/', $password) || !preg_match('/\d/', $password)) {
        $errors['password'] = ['The password must be at least 8 characters and contain a letter and a number.'];
    }
    if ($role !== 'customer' && $role !== 'seller') {
        $errors['role'] = ['The role must be customer or seller.'];
    }
    if ($errors) {
        fail(422, 'The given data was invalid.', $errors);
    }

    // Store a hash of the password, never the password itself
    run_query('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
        'ssss', [$name, $email, password_hash($password, PASSWORD_DEFAULT), $role]);
    global $conn;
    $user = select_one('SELECT * FROM users WHERE id = ?', 'i', [mysqli_insert_id($conn)]);

    send_json(201, ['message' => 'Registered successfully.'] + issue_token($user) + ['user' => public_user($user)]);
}

// POST /api/auth/login  { email, password }
function login() {
    $data = read_json();
    $email = strtolower(trim($data['email'] ?? ''));
    $password = $data['password'] ?? '';
    if (!filter_var($email, FILTER_VALIDATE_EMAIL) || $password === '') {
        fail(422, 'The given data was invalid.', ['email' => ['Email and password are required.']]);
    }

    $user = select_one('SELECT * FROM users WHERE email = ?', 's', [$email]);
    // The same message for a wrong email and a wrong password, so nobody can test which emails exist
    if (!$user || !password_verify($password, $user['password_hash'])) {
        fail(401, 'Invalid email or password.');
    }
    send_json(200, ['message' => 'Logged in successfully.'] + issue_token($user) + ['user' => public_user($user)]);
}

// POST /api/auth/logout  (Bearer token): the token stops working
function logout() {
    $user = current_user();
    if (!$user) {
        fail(401, 'Unauthenticated.');
    }
    run_query('DELETE FROM tokens WHERE token = ?', 's', [bearer_token()]);
    send_json(200, ['message' => 'Logged out.']);
}

// GET /api/auth/me  (Bearer token)
function me() {
    $user = current_user();
    if (!$user) {
        fail(401, 'Unauthenticated.');
    }
    send_json(200, ['data' => public_user($user)]);
}
