<?php
// Settings for the Palengke Online API. Change these to match your MySQL.

// XAMPP's default MySQL account is "root" with no password.
$DB_HOST = 'localhost';
$DB_USER = 'root';
$DB_PASS = '';
$DB_NAME = 'palengke';
$DB_PORT = 3306;

$TOKEN_HOURS = 8;                     // a login token is valid for 8 hours
$MAX_IMAGE_BYTES = 2 * 1024 * 1024;   // largest photo: 2 MB

date_default_timezone_set('Asia/Manila');

// Make mysqli throw an error (exception) when a query fails, instead of failing silently
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

// One database connection for the whole request
$conn = mysqli_connect($DB_HOST, $DB_USER, $DB_PASS, $DB_NAME, $DB_PORT);
mysqli_set_charset($conn, 'utf8mb4');
