<?php
// Categories.

// GET /api/categories
function list_categories() {
    $rows = select_all('SELECT id, name FROM categories ORDER BY id');
    foreach ($rows as $i => $row) {
        $rows[$i]['id'] = (int) $row['id'];   // MySQL gives numbers back as text: turn them into numbers
    }
    send_json(200, ['data' => $rows]);
}
