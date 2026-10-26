/**
 * Palengke Online REST API (provided by the back-end team).
 *
 * Run:    node server.js            -> http://localhost:4000
 * Reset:  node server.js --reset    -> restores the original sample data
 * Slow:   node server.js --slow     -> adds a 1-second delay to every response (test loading states)
 *
 * Uses only Node.js built-in modules, so no `npm install` is needed and it runs offline.
 * Data is saved in data/db.json; the original sample data is in data/seed.json.
 * Uploaded product photos are saved in uploads/ under a random UUID file name.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = Number(process.env.PORT) || 4000;
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const SEED_FILE = path.join(DATA_DIR, 'seed.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const TOKEN_HOURS = 8;
const SLOW = process.argv.includes('--slow');
const MAX_BODY = 3 * 1024 * 1024;    // whole request: 3 MB
const MAX_IMAGE = 2 * 1024 * 1024;   // one image: 2 MB
const UUID_IMAGE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/;

// ---------- Data store ----------
if (process.argv.includes('--reset') || !fs.existsSync(DB_FILE)) {
  fs.copyFileSync(SEED_FILE, DB_FILE);
  // Remove photos uploaded during earlier practice runs (sample photos are kept)
  for (const f of fs.readdirSync(UPLOADS_DIR)) if (UUID_IMAGE.test(f)) fs.unlinkSync(path.join(UPLOADS_DIR, f));
  console.log('Sample data loaded from data/seed.json');
}
const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
db.cart_items = db.cart_items || [];   // { user_id, product_id, quantity }
db.orders = db.orders || [];           // { id, user_id, address, notes, status, total, created_at, items: [...] }
const save = () => fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
const nextId = (list) => list.reduce((max, item) => Math.max(max, item.id), 0) + 1;
const now = () => new Date().toISOString();

// ---------- Passwords and tokens ----------
function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 32).toString('hex');
  return { salt, hash };
}
function passwordMatches(user, password) {
  const { hash } = hashPassword(password, user.salt);
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(user.password_hash, 'hex'));
}
function issueToken(user) {
  const token = crypto.randomBytes(32).toString('hex');
  const expires_at = new Date(Date.now() + TOKEN_HOURS * 3600 * 1000).toISOString();
  db.tokens.push({ token, user_id: user.id, expires_at });
  save();
  return { token, token_type: 'Bearer', expires_at };
}
const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, created_at: u.created_at });

/** Returns the logged-in user from "Authorization: Bearer <token>", or null. */
function currentUser(req) {
  const match = /^Bearer\s+([a-f0-9]{64})$/i.exec(req.headers.authorization || '');
  if (!match) return null;
  const row = db.tokens.find((t) => t.token === match[1]);
  if (!row || new Date(row.expires_at) < new Date()) return null;
  return db.users.find((u) => u.id === row.user_id) || null;
}

// ---------- HTTP helpers ----------
function send(res, status, body) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'X-Content-Type-Options': 'nosniff'
  };
  if (body === undefined) { res.writeHead(status, headers); res.end(); return; }
  headers['Content-Type'] = 'application/json; charset=utf-8';
  res.writeHead(status, headers);
  res.end(JSON.stringify(body));
}
const fail = (res, status, message, errors) => send(res, status, errors ? { message, errors } : { message });

const httpError = (status, message) => Object.assign(new Error(message), { status });

/** Reads the whole request body as a Buffer; rejects bodies over MAX_BODY with 413. */
function readRaw(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size <= MAX_BODY) chunks.push(chunk);   // over the limit: keep reading but drop the data
    });
    // Answer only after the whole body has arrived, so the browser receives the 413 message
    req.on('end', () => (size > MAX_BODY ? reject(httpError(413, 'Request body too large (max 3 MB).')) : resolve(Buffer.concat(chunks))));
    req.on('error', reject);
  });
}

async function readJson(req) {
  const raw = (await readRaw(req)).toString('utf8');
  if (!raw) return {};
  try { return JSON.parse(raw); }
  catch { throw httpError(400, 'Request body must be valid JSON.'); }
}

/**
 * Parses multipart/form-data: text fields, plus one optional file in the field "image".
 * @returns {Promise<{fields: Record<string, string>, file: {filename: string, data: Buffer} | null}>}
 */
async function readMultipart(req) {
  const match = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(req.headers['content-type'] || '');
  if (!match) throw httpError(400, 'Missing multipart boundary.');
  const boundary = Buffer.from('--' + (match[1] || match[2]).trim());
  const raw = await readRaw(req);
  const fields = {};
  let file = null;

  let pos = raw.indexOf(boundary);
  while (pos !== -1) {
    const start = pos + boundary.length;
    if (raw.slice(start, start + 2).toString() === '--') break;          // closing boundary
    const next = raw.indexOf(boundary, start);
    if (next === -1) break;
    const part = raw.slice(start + 2, next - 2);                         // drop the CRLF after and before the boundaries
    const headerEnd = part.indexOf('\r\n\r\n');
    if (headerEnd !== -1) {
      const headers = part.slice(0, headerEnd).toString('utf8');
      const data = part.slice(headerEnd + 4);
      const name = (/\bname="([^"]*)"/i.exec(headers) || [])[1];
      const filename = (/\bfilename="([^"]*)"/i.exec(headers) || [])[1];
      if (name === 'image' && filename) file = { filename, data };
      else if (name && filename === undefined) fields[name] = data.toString('utf8');
    }
    pos = next;
  }
  return { fields, file };
}

/**
 * Reads a product from JSON, or from multipart/form-data (text fields are converted to numbers).
 * @returns {Promise<{body: object, file: {filename: string, data: Buffer} | null}>}
 */
async function readProductBody(req) {
  if (!/^multipart\/form-data/i.test(req.headers['content-type'] || '')) return { body: await readJson(req), file: null };
  const { fields, file } = await readMultipart(req);
  const num = (v) => (v === undefined || v.trim() === '' ? NaN : Number(v));
  return {
    body: {
      name: fields.name, description: fields.description,
      price: num(fields.price), stock: num(fields.stock), category_id: num(fields.category_id),
      remove_image: fields.remove_image === 'true',
      _method: fields._method
    },
    file
  };
}

// ---------- Images ----------
/** JPG, PNG or WebP, detected from the file's first bytes (the name and declared type can lie). */
function imageExtension(buf) {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.length > 8 && buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.length > 12 && buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP') return 'webp';
  return null;
}

/** Adds an "image" error when the uploaded file is not an allowed image or is too big. */
function validateImage(file, errors) {
  if (!file) return;
  if (!imageExtension(file.data)) errors.image = ['The image must be a JPG, PNG or WebP file.'];
  else if (file.data.length > MAX_IMAGE) errors.image = ['The image may not be larger than 2 MB.'];
}

/** Saves an uploaded image as <uuid>.<ext> and returns its public path. */
function saveImage(file) {
  const name = `${crypto.randomUUID()}.${imageExtension(file.data)}`;
  fs.writeFileSync(path.join(UPLOADS_DIR, name), file.data);
  return `/uploads/${name}`;
}

/** Deletes an uploaded image (only UUID files; the sample photos are never deleted). */
function deleteImage(imageUrl) {
  const name = imageUrl ? path.basename(imageUrl) : '';
  if (UUID_IMAGE.test(name) && fs.existsSync(path.join(UPLOADS_DIR, name))) fs.unlinkSync(path.join(UPLOADS_DIR, name));
}

// ---------- Validation ----------
const isEmail = (v) => typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
function validateRegister(b) {
  const errors = {};
  if (typeof b.name !== 'string' || b.name.trim().length < 2 || b.name.trim().length > 60) errors.name = ['The name must be 2 to 60 characters.'];
  if (!isEmail(b.email)) errors.email = ['The email must be a valid email address.'];
  else if (db.users.some((u) => u.email.toLowerCase() === b.email.toLowerCase())) errors.email = ['The email has already been taken.'];
  if (typeof b.password !== 'string' || b.password.length < 8 || !/[A-Za-z]/.test(b.password) || !/\d/.test(b.password)) {
    errors.password = ['The password must be at least 8 characters and contain a letter and a number.'];
  }
  if (!['customer', 'seller'].includes(b.role)) errors.role = ['The role must be customer or seller.'];
  return errors;
}
function validateProduct(b) {
  const errors = {};
  if (typeof b.name !== 'string' || b.name.trim().length < 3 || b.name.trim().length > 80) errors.name = ['The name must be 3 to 80 characters.'];
  if (typeof b.price !== 'number' || !Number.isFinite(b.price) || b.price <= 0) errors.price = ['The price must be a number greater than 0.'];
  if (!Number.isInteger(b.stock) || b.stock < 0) errors.stock = ['The stock must be a whole number, 0 or more.'];
  if (!db.categories.some((c) => c.id === b.category_id)) errors.category_id = ['The selected category is invalid.'];
  if (b.description !== undefined && (typeof b.description !== 'string' || b.description.length > 500)) errors.description = ['The description may not be longer than 500 characters.'];
  if (b.image_url !== undefined && b.image_url !== null && (typeof b.image_url !== 'string' || !/^\/uploads\/[\w.-]+$/.test(b.image_url))) {
    errors.image_url = ['The image_url must be a path like /uploads/file.webp.'];
  }
  return errors;
}

const productOut = (p) => {
  const seller = db.users.find((u) => u.id === p.seller_id);
  return { ...p, seller_name: seller ? seller.name : null };
};

// ---------- Routes ----------
async function handle(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const parts = url.pathname.replace(/\/+$/, '').split('/').filter(Boolean);   // e.g. ['api','products','3']
  const method = req.method;

  if (method === 'OPTIONS') return send(res, 204);

  // Static product images: GET /uploads/<file>
  if (method === 'GET' && parts[0] === 'uploads' && parts.length === 2) {
    const file = path.join(UPLOADS_DIR, path.basename(parts[1]));
    if (!fs.existsSync(file)) return fail(res, 404, 'Image not found.');
    const types = { '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
    const type = types[path.extname(file).toLowerCase()];
    if (!type) return fail(res, 404, 'Image not found.');
    res.writeHead(200, { 'Content-Type': type, 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'max-age=3600', 'X-Content-Type-Options': 'nosniff' });
    return fs.createReadStream(file).pipe(res);
  }

  if (parts[0] !== 'api') return fail(res, 404, 'Not found. All endpoints start with /api.');
  const route = parts.slice(1);

  // GET /api/health
  if (method === 'GET' && route[0] === 'health' && route.length === 1) return send(res, 200, { status: 'ok', time: now() });

  // ----- Auth -----
  if (route[0] === 'auth') {
    if (method === 'POST' && route[1] === 'register') {
      const b = await readJson(req);
      const errors = validateRegister(b);
      if (Object.keys(errors).length) return fail(res, 422, 'The given data was invalid.', errors);
      const { salt, hash } = hashPassword(b.password);
      const user = { id: nextId(db.users), name: b.name.trim(), email: b.email.trim().toLowerCase(), role: b.role, salt, password_hash: hash, created_at: now() };
      db.users.push(user);
      save();
      return send(res, 201, { message: 'Registered successfully.', ...issueToken(user), user: publicUser(user) });
    }
    if (method === 'POST' && route[1] === 'login') {
      const b = await readJson(req);
      if (!isEmail(b.email) || typeof b.password !== 'string' || !b.password) {
        return fail(res, 422, 'The given data was invalid.', { email: ['Email and password are required.'] });
      }
      const user = db.users.find((u) => u.email === b.email.trim().toLowerCase());
      if (!user || !passwordMatches(user, b.password)) return fail(res, 401, 'Invalid email or password.');
      return send(res, 200, { message: 'Logged in successfully.', ...issueToken(user), user: publicUser(user) });
    }
    if (method === 'POST' && route[1] === 'logout') {
      const user = currentUser(req);
      if (!user) return fail(res, 401, 'Unauthenticated.');
      const token = req.headers.authorization.split(' ')[1];
      db.tokens = db.tokens.filter((t) => t.token !== token);
      save();
      return send(res, 200, { message: 'Logged out.' });
    }
    if (method === 'GET' && route[1] === 'me') {
      const user = currentUser(req);
      if (!user) return fail(res, 401, 'Unauthenticated.');
      return send(res, 200, { data: publicUser(user) });
    }
  }

  // ----- Categories -----
  if (route[0] === 'categories' && method === 'GET') {
    if (route.length === 1) return send(res, 200, { data: db.categories });
    // GET /api/categories/:id/products -> same as /api/products?category_id=:id
    if (route.length === 3 && route[2] === 'products') {
      const id = Number(route[1]);
      if (!db.categories.some((c) => c.id === id)) return fail(res, 404, 'Category not found.');
      url.searchParams.set('category_id', String(id));
      return listProducts(res, url);
    }
  }

  // ----- Products (public) -----
  if (route[0] === 'products' && method === 'GET') {
    if (route.length === 1) return listProducts(res, url);
    if (route.length === 2) {
      const p = db.products.find((x) => x.id === Number(route[1]));
      return p ? send(res, 200, { data: productOut(p) }) : fail(res, 404, 'Product not found.');
    }
  }

  // ----- Products (seller only) -----
  const needsSeller = (route[0] === 'products' && ['POST', 'PUT', 'DELETE'].includes(method)) ||
                      (route[0] === 'seller' && (route[1] === 'products' || route[1] === 'summary'));
  if (needsSeller) {
    const user = currentUser(req);
    if (!user) return fail(res, 401, 'Unauthenticated.');
    if (user.role !== 'seller') return fail(res, 403, 'This action is for sellers only.');

    // GET /api/seller/products: the seller's own products, with the same search/filters/pages as /api/products
    if (method === 'GET' && route[0] === 'seller' && route[1] === 'products' && route.length === 2) {
      return listProducts(res, url, user.id);
    }
    // GET /api/seller/summary: totals over ALL the seller's products
    if (method === 'GET' && route[0] === 'seller' && route[1] === 'summary' && route.length === 2) {
      const mine = db.products.filter((p) => p.seller_id === user.id);
      return send(res, 200, { data: {
        products: mine.length,
        units: mine.reduce((sum, p) => sum + p.stock, 0),
        stock_value: Math.round(mine.reduce((sum, p) => sum + p.price * p.stock, 0) * 100) / 100,
        out_of_stock: mine.filter((p) => p.stock === 0).length
      } });
    }
    if (method === 'POST' && route.length === 1) {
      const { body: b, file } = await readProductBody(req);
      const errors = validateProduct(b);
      validateImage(file, errors);
      if (Object.keys(errors).length) return fail(res, 422, 'The given data was invalid.', errors);
      const p = {
        id: nextId(db.products), name: b.name.trim(), description: (b.description || '').trim(), price: Math.round(b.price * 100) / 100,
        stock: b.stock, category_id: b.category_id, image_url: file ? saveImage(file) : (b.image_url || null),
        seller_id: user.id, created_at: now(), updated_at: now()
      };
      db.products.push(p);
      save();
      return send(res, 201, { message: 'Product created.', data: productOut(p) });
    }
    // PUT /api/products/:id, or POST /api/products/:id with _method=PUT (forms with a photo, as PHP needs)
    if ((method === 'PUT' || method === 'DELETE' || method === 'POST') && route.length === 2) {
      const p = db.products.find((x) => x.id === Number(route[1]));
      if (!p) return fail(res, 404, 'Product not found.');
      if (p.seller_id !== user.id) return fail(res, 403, 'You can only change your own products.');
      if (method === 'DELETE') {
        deleteImage(p.image_url);
        db.products = db.products.filter((x) => x.id !== p.id);
        db.cart_items = db.cart_items.filter((c) => c.product_id !== p.id);   // also take it out of every cart
        save();
        return send(res, 200, { message: 'Product deleted.' });
      }
      const { body: b, file } = await readProductBody(req);
      if (method === 'POST' && b._method !== 'PUT') return fail(res, 404, `No endpoint for POST ${url.pathname}.`);
      const errors = validateProduct(b);
      validateImage(file, errors);
      if (Object.keys(errors).length) return fail(res, 422, 'The given data was invalid.', errors);
      // New photo: replace (and delete the old file). remove_image: no photo. Otherwise keep the current one.
      let imageUrl = p.image_url;
      if (file) { deleteImage(p.image_url); imageUrl = saveImage(file); }
      else if (b.remove_image) { deleteImage(p.image_url); imageUrl = null; }
      else if (b.image_url !== undefined) imageUrl = b.image_url;
      Object.assign(p, {
        name: b.name.trim(), description: (b.description || '').trim(), price: Math.round(b.price * 100) / 100,
        stock: b.stock, category_id: b.category_id, image_url: imageUrl, updated_at: now()
      });
      save();
      return send(res, 200, { message: 'Product updated.', data: productOut(p) });
    }
  }

  // ----- Cart and orders (customers only) -----
  if (route[0] === 'cart' || route[0] === 'orders') {
    const user = currentUser(req);
    if (!user) return fail(res, 401, 'Unauthenticated.');
    if (user.role !== 'customer') return fail(res, 403, 'This action is for customers only.');

    if (route[0] === 'cart') {
      // GET /api/cart
      if (method === 'GET' && route.length === 1) return send(res, 200, { data: cartOut(user.id) });

      // POST /api/cart { product_id, quantity }: adds to the line if the product is already in the cart
      if (method === 'POST' && route.length === 1) {
        const b = await readJson(req);
        const quantity = b.quantity === undefined ? 1 : b.quantity;
        const product = db.products.find((p) => p.id === b.product_id);
        if (!product) return fail(res, 422, 'The given data was invalid.', { product_id: ['The selected product is invalid.'] });
        if (!Number.isInteger(quantity) || quantity < 1) return fail(res, 422, 'The given data was invalid.', { quantity: ['The quantity must be a whole number, 1 or more.'] });
        const line = db.cart_items.find((c) => c.user_id === user.id && c.product_id === product.id);
        const wanted = (line ? line.quantity : 0) + quantity;
        const stockError = stockProblem(product, wanted);
        if (stockError) return fail(res, 422, 'The given data was invalid.', { quantity: [stockError] });
        if (line) line.quantity = wanted;
        else db.cart_items.push({ user_id: user.id, product_id: product.id, quantity: wanted });
        save();
        return send(res, 200, { message: 'Added to cart.', data: cartOut(user.id) });
      }

      // PUT /api/cart/:product_id { quantity } and DELETE /api/cart/:product_id
      if ((method === 'PUT' || method === 'DELETE') && route.length === 2) {
        const productId = Number(route[1]);
        const line = db.cart_items.find((c) => c.user_id === user.id && c.product_id === productId);
        if (!line) return fail(res, 404, 'This product is not in your cart.');
        if (method === 'DELETE') {
          db.cart_items = db.cart_items.filter((c) => c !== line);
          save();
          return send(res, 200, { message: 'Removed from cart.', data: cartOut(user.id) });
        }
        const b = await readJson(req);
        if (!Number.isInteger(b.quantity) || b.quantity < 1) return fail(res, 422, 'The given data was invalid.', { quantity: ['The quantity must be a whole number, 1 or more.'] });
        const stockError = stockProblem(db.products.find((p) => p.id === productId), b.quantity);
        if (stockError) return fail(res, 422, 'The given data was invalid.', { quantity: [stockError] });
        line.quantity = b.quantity;
        save();
        return send(res, 200, { message: 'Cart updated.', data: cartOut(user.id) });
      }
    }

    if (route[0] === 'orders') {
      // GET /api/orders: the customer's orders, newest first
      if (method === 'GET' && route.length === 1) {
        const mine = db.orders.filter((o) => o.user_id === user.id).sort((a, b) => b.id - a.id).map(orderOut);
        return send(res, 200, { data: mine });
      }
      // GET /api/orders/:id
      if (method === 'GET' && route.length === 2) {
        const order = db.orders.find((o) => o.id === Number(route[1]) && o.user_id === user.id);
        return order ? send(res, 200, { data: orderOut(order) }) : fail(res, 404, 'Order not found.');
      }
      // POST /api/orders { address, notes }: checkout. Prices and totals come from the server, never the browser.
      if (method === 'POST' && route.length === 1) {
        const b = await readJson(req);
        const errors = {};
        const address = typeof b.address === 'string' ? b.address.trim() : '';
        const notes = typeof b.notes === 'string' ? b.notes.trim() : '';
        if (address.length < 5 || address.length > 200) errors.address = ['The delivery address must be 5 to 200 characters.'];
        if (notes.length > 200) errors.notes = ['The notes may not be longer than 200 characters.'];
        const lines = db.cart_items.filter((c) => c.user_id === user.id);
        if (!lines.length) errors.cart = ['Your cart is empty.'];
        for (const line of lines) {
          const product = db.products.find((p) => p.id === line.product_id);
          const stockError = stockProblem(product, line.quantity);
          if (stockError) { errors.cart = [stockError]; break; }
        }
        if (Object.keys(errors).length) return fail(res, 422, 'The given data was invalid.', errors);

        const items = lines.map((line) => {
          const product = db.products.find((p) => p.id === line.product_id);
          product.stock -= line.quantity;                                   // the stock goes down
          return { product_id: product.id, name: product.name, price: product.price, quantity: line.quantity,
                   line_total: Math.round(product.price * line.quantity * 100) / 100 };
        });
        const order = {
          id: nextId(db.orders), user_id: user.id, address, notes, status: 'placed',
          total: Math.round(items.reduce((sum, i) => sum + i.line_total, 0) * 100) / 100,
          created_at: now(), items
        };
        db.orders.push(order);
        db.cart_items = db.cart_items.filter((c) => c.user_id !== user.id);   // empty the cart
        save();
        return send(res, 201, { message: 'Order placed.', data: orderOut(order) });
      }
    }
  }

  return fail(res, 404, `No endpoint for ${method} ${url.pathname}.`);
}

/** '' when the product can be bought in this quantity; otherwise the reason. */
function stockProblem(product, quantity) {
  if (!product) return 'A product in your cart is no longer available.';
  if (product.stock === 0) return `${product.name} is out of stock.`;
  if (quantity > product.stock) return `Only ${product.stock} left of ${product.name}.`;
  return '';
}

/** The customer's cart with product details and totals. */
function cartOut(userId) {
  const items = db.cart_items.filter((c) => c.user_id === userId).map((c) => {
    const p = db.products.find((x) => x.id === c.product_id);
    return { product_id: p.id, name: p.name, price: p.price, image_url: p.image_url, stock: p.stock,
             quantity: c.quantity, line_total: Math.round(p.price * c.quantity * 100) / 100 };
  });
  return {
    items,
    count: items.reduce((sum, i) => sum + i.quantity, 0),
    total: Math.round(items.reduce((sum, i) => sum + i.line_total, 0) * 100) / 100
  };
}

const orderOut = (o) => ({ id: o.id, address: o.address, notes: o.notes, status: o.status, total: o.total, created_at: o.created_at, items: o.items });

/** GET /api/products with search, category_id, min_price, max_price, sort, page, limit. */
function listProducts(res, url, sellerId = null) {
  const q = url.searchParams;
  const stock = q.get('stock') || '';   // '' (all), 'in' (in stock) or 'out' (out of stock)
  const search = (q.get('search') || '').trim().toLowerCase();
  const categoryId = q.get('category_id') ? Number(q.get('category_id')) : null;
  const min = q.get('min_price') !== null && q.get('min_price') !== '' ? Number(q.get('min_price')) : null;
  const max = q.get('max_price') !== null && q.get('max_price') !== '' ? Number(q.get('max_price')) : null;
  const sort = q.get('sort') || 'newest';
  const page = Math.max(1, parseInt(q.get('page'), 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(q.get('limit'), 10) || 8));

  if ([min, max].some((n) => n !== null && !Number.isFinite(n))) {
    return fail(res, 422, 'The given data was invalid.', { price: ['min_price and max_price must be numbers.'] });
  }
  if (!['newest', 'price_asc', 'price_desc', 'name'].includes(sort)) {
    return fail(res, 422, 'The given data was invalid.', { sort: ['sort must be newest, price_asc, price_desc or name.'] });
  }
  if (!['', 'in', 'out'].includes(stock)) {
    return fail(res, 422, 'The given data was invalid.', { stock: ['stock must be in or out.'] });
  }

  let list = db.products.filter((p) =>
    (!search || p.name.toLowerCase().includes(search) || (p.description || '').toLowerCase().includes(search)) &&
    (categoryId === null || p.category_id === categoryId) &&
    (min === null || p.price >= min) &&
    (max === null || p.price <= max) &&
    (sellerId === null || p.seller_id === sellerId) &&
    (stock === '' || (stock === 'in' ? p.stock > 0 : p.stock === 0)));
  const sorters = {
    newest: (a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id,
    price_asc: (a, b) => a.price - b.price || a.id - b.id,
    price_desc: (a, b) => b.price - a.price || a.id - b.id,
    name: (a, b) => a.name.localeCompare(b.name)
  };
  list = list.sort(sorters[sort]);
  const total = list.length;
  const data = list.slice((page - 1) * limit, page * limit).map(productOut);
  return send(res, 200, { data, meta: { page, limit, total, total_pages: Math.max(1, Math.ceil(total / limit)) } });
}

http.createServer((req, res) => {
  const run = () => handle(req, res).catch((err) => {
    if (err.status) return fail(res, err.status, err.message);
    console.error(err);
    fail(res, 500, 'Server error.');
  });
  console.log(`${new Date().toLocaleTimeString()}  ${req.method} ${req.url}`);
  if (SLOW) setTimeout(run, 1000); else run();
}).listen(PORT, () => {
  console.log(`Palengke Online API running at http://localhost:${PORT}/api`);
  console.log('Sample logins: juan@example.com / Customer123 (customer), maria@example.com / Seller123 (seller), pedro@example.com / Seller123 (seller)');
});
