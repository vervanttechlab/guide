/*
 * orders.js: the "My orders" page (orders.html), for customers only.
 * Shows all of the customer's orders from GET /api/orders, newest first,
 * each as a Bootstrap card with its items, total, address and notes.
 * Uses the helper functions from api.js.
 */

// Only customers may use this page; everyone else is sent to the login page
const isCustomer = requireRole('customer');

const ordersAlert = document.getElementById('orders-alert');
const loading = document.getElementById('loading');
const noOrders = document.getElementById('no-orders');
const orderList = document.getElementById('order-list');

// Shows a date and time like "Oct 26, 2026, 2:30 PM".
function formatDate(text) {
  const date = new Date(text);
  return date.toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' });
}

// GET /api/orders, then shows one card per order.
async function loadOrders() {
  loading.hidden = false;
  try {
    const result = await apiFetch('/orders', 'GET', null, true);
    const orders = result.data;
    noOrders.hidden = orders.length > 0;
    for (const order of orders) {
      orderList.append(makeOrderCard(order));
    }
  } catch (error) {
    console.error(error);
    if (error.status === 401) {
      location.replace('login.html?next=orders.html');   // the login expired
      return;
    }
    showAlert(ordersAlert, 'danger', error.message);
  }
  loading.hidden = true;
}

// One order: a card with a header (number, date, status), a table of items, and the total.
function makeOrderCard(order) {
  // Header: "Order #2" on the left; date and status on the right
  const header = makeElement('div', 'card-header d-flex flex-wrap justify-content-between align-items-center gap-2');
  const title = makeElement('h2', 'h6 mb-0', 'Order #' + order.id);
  const info = makeElement('span', 'small text-body-secondary', formatDate(order.created_at) + ' ');
  info.append(makeElement('span', 'badge text-bg-success text-capitalize', order.status));
  header.append(title, info);

  // Items table
  const table = makeElement('table', 'table table-sm align-middle mb-0');
  const head = makeElement('thead');
  const headRow = makeElement('tr');
  const headings = ['Product', 'Price', 'Qty', 'Total'];
  for (const heading of headings) {
    const cell = makeElement('th', '', heading);
    cell.scope = 'col';
    if (heading !== 'Product') {
      cell.className = 'text-end';
    }
    headRow.append(cell);
  }
  head.append(headRow);

  const body = makeElement('tbody');
  for (const item of order.items) {
    const row = makeElement('tr');
    row.append(
      makeElement('td', '', item.name),
      makeElement('td', 'text-end text-nowrap', formatPeso(item.price)),
      makeElement('td', 'text-end', String(item.quantity)),
      makeElement('td', 'text-end text-nowrap', formatPeso(item.line_total))
    );
    body.append(row);
  }
  table.append(head, body);
  const tableWrap = makeElement('div', 'table-responsive');
  tableWrap.append(table);

  // Delivery details and the total
  const details = makeElement('div', 'card-body d-flex flex-column flex-md-row justify-content-between gap-2');
  const delivery = makeElement('div', 'small');
  delivery.append(makeElement('div', '', 'Deliver to: ' + order.address));
  if (order.notes) {
    delivery.append(makeElement('div', 'text-body-secondary', 'Notes: ' + order.notes));
  }
  const total = makeElement('div', 'fs-5 fw-bold text-palengke', 'Total ' + formatPeso(order.total));
  details.append(delivery, total);

  const card = makeElement('article', 'card shadow-sm');
  card.append(header, tableWrap, details);
  return card;
}

// Coming from checkout (orders.html?placed=3)? Say thank you.
function showThankYou() {
  const placedId = new URLSearchParams(location.search).get('placed');
  if (placedId) {
    showAlert(ordersAlert, 'success', 'Thank you! Your order #' + placedId + ' has been placed. Payment is cash on delivery.');
    ordersAlert.focus();
  }
}

if (isCustomer) {
  showThankYou();
  loadOrders();
}
