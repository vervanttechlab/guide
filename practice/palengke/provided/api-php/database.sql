-- Palengke Online database (MySQL / MariaDB, e.g. XAMPP).
-- Import it in phpMyAdmin (Import tab), or run:  mysql -u root < database.sql
-- Running it again resets everything to the sample data.

DROP DATABASE IF EXISTS palengke;
CREATE DATABASE palengke CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE palengke;

-- Accounts. password_hash holds a bcrypt hash from PHP's password_hash(), never the password itself.
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(60) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('customer', 'seller') NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Login tokens: one row per login, deleted on logout, valid until expires_at.
CREATE TABLE tokens (
  token CHAR(64) PRIMARY KEY,
  user_id INT NOT NULL,
  expires_at DATETIME NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(40) NOT NULL
);

-- image_url is a path like /uploads/<uuid>.jpg, or NULL when there is no photo.
CREATE TABLE products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  description VARCHAR(500) NOT NULL DEFAULT '',
  price DECIMAL(10, 2) NOT NULL,
  stock INT NOT NULL DEFAULT 0,
  category_id INT NOT NULL,
  image_url VARCHAR(255) NULL,
  seller_id INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id),
  FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE
);

-- What each customer has in the cart: one row per product.
CREATE TABLE cart_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL,
  UNIQUE (user_id, product_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Orders. The total is worked out by the server, never taken from the browser.
CREATE TABLE orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  address VARCHAR(200) NOT NULL,
  notes VARCHAR(200) NOT NULL DEFAULT '',
  status VARCHAR(20) NOT NULL DEFAULT 'placed',
  total DECIMAL(10, 2) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- The products of each order. The name and price are copied, so an old order
-- stays correct even after the seller changes or deletes the product.
CREATE TABLE order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT NULL,
  name VARCHAR(80) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  quantity INT NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

-- Sample accounts. Passwords: Customer123 (Juan), Seller123 (Maria and Pedro).
INSERT INTO users (id, name, email, password_hash, role, created_at) VALUES
(1, 'Juan Dela Cruz', 'juan@example.com', '$2y$10$eoUbVHM.W0jZtw9DWVvPveZx0gePE76v0Nya4cHebFurmPe8bWOae', 'customer', '2026-10-01 08:00:00'),
(2, 'Maria Santos', 'maria@example.com', '$2y$10$dBA2D0xbzo0nROgQ1Ngapujmvb8bcgMJ4w3R7NHOWLE3yA5BkvtiG', 'seller', '2026-10-01 09:00:00'),
(3, 'Pedro Reyes', 'pedro@example.com', '$2y$10$dBA2D0xbzo0nROgQ1Ngapujmvb8bcgMJ4w3R7NHOWLE3yA5BkvtiG', 'seller', '2026-10-01 10:00:00');

INSERT INTO categories (id, name) VALUES
(1, 'Vegetables'), (2, 'Fruits'), (3, 'Seafood'), (4, 'Rice & Grains'), (5, 'Native Delicacies');

INSERT INTO products (id, name, description, price, stock, category_id, image_url, seller_id, created_at, updated_at) VALUES
(1, 'Kangkong (1 bundle)', 'Fresh water spinach from Laguna, good for sinigang and adobong kangkong.', 25.00, 120, 1, '/uploads/kangkong.webp', 2, '2026-10-01 18:00:00', '2026-10-01 18:00:00'),
(2, 'Pechay Baguio (1 kg)', 'Crisp napa cabbage from Benguet.', 60.00, 45, 1, '/uploads/pechay.webp', 2, '2026-10-01 19:00:00', '2026-10-01 19:00:00'),
(3, 'Ampalaya (1 kg)', 'Bitter gourd, harvested this week.', 90.00, 30, 1, '/uploads/ampalaya.webp', 3, '2026-10-01 20:00:00', '2026-10-01 20:00:00'),
(4, 'Carabao Mango (1 kg)', 'Sweet Guimaras mangoes, ripe in 2 to 3 days.', 160.00, 25, 2, '/uploads/mango.webp', 2, '2026-10-01 21:00:00', '2026-10-01 21:00:00'),
(5, 'Lakatan Banana (1 dozen)', 'Yellow lakatan bananas from Davao.', 95.00, 40, 2, '/uploads/banana.webp', 3, '2026-10-01 22:00:00', '2026-10-01 22:00:00'),
(6, 'Calamansi (1/2 kg)', 'Native calamansi for juice and sawsawan.', 45.00, 0, 2, '/uploads/calamansi.webp', 3, '2026-10-01 23:00:00', '2026-10-01 23:00:00'),
(7, 'Bangus (1 kg)', 'Milkfish from Dagupan, cleaned and scaled.', 190.00, 18, 3, '/uploads/bangus.webp', 2, '2026-10-02 00:00:00', '2026-10-02 00:00:00'),
(8, 'Tilapia (1 kg)', 'Live-caught tilapia from Taal Lake.', 140.00, 22, 3, '/uploads/tilapia.webp', 3, '2026-10-02 01:00:00', '2026-10-02 01:00:00'),
(9, 'Dinorado Rice (5 kg)', 'Aromatic premium rice.', 380.00, 15, 4, '/uploads/dinorado.webp', 2, '2026-10-02 02:00:00', '2026-10-02 02:00:00'),
(10, 'Brown Rice (2 kg)', 'Unpolished brown rice, high in fiber.', 165.00, 12, 4, '/uploads/brownrice.webp', 3, '2026-10-02 03:00:00', '2026-10-02 03:00:00'),
(11, 'Bibingka (2 pcs)', 'Rice cake baked in banana leaves with salted egg.', 70.00, 20, 5, '/uploads/bibingka.webp', 2, '2026-10-02 04:00:00', '2026-10-02 04:00:00'),
(12, 'Suman sa Ibos (6 pcs)', 'Sticky rice wrapped in palm leaves.', 55.00, 35, 5, NULL, 3, '2026-10-02 05:00:00', '2026-10-02 05:00:00');

-- One earlier order of Juan, so "My orders" has something to show.
INSERT INTO orders (id, user_id, address, notes, status, total, created_at) VALUES
(1, 1, 'Blk 5 Lot 12 Mabini St., Lipa City, Batangas', 'Please call when you are outside.', 'placed', 390.00, '2026-10-05 11:15:00');
INSERT INTO order_items (order_id, product_id, name, price, quantity) VALUES
(1, 4, 'Carabao Mango (1 kg)', 160.00, 2),
(1, 11, 'Bibingka (2 pcs)', 70.00, 1);
