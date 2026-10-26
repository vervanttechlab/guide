/*
 * cart.js: the cart page (cart.html), for customers only.
 * Shows the cart from GET /api/cart, lets the customer change quantities (PUT)
 * and remove items (DELETE), and places the order (POST /api/orders = checkout).
 * The server works out all prices and totals; we only show what it sends back.
 * Uses the helper functions from api.js.
 */

// Only customers may use this page; everyone else is sent to the login page
const isCustomer = requireRole('customer');

// ===== Elements on the page =====
const cartAlert = document.getElementById('cart-alert');
const loading = document.getElementById('loading');
const emptyCart = document.getElementById('empty-cart');
const cartContent = document.getElementById('cart-content');
const cartLines = document.getElementById('cart-lines');
const countText = document.getElementById('cart-count');
const totalText = document.getElementById('cart-total');
const checkoutForm = document.getElementById('checkout-form');
const addressField = document.getElementById('address');
const notesField = document.getElementById('notes');
const placeOrderButton = document.getElementById('place-order-btn');

let cart = null;    // the last cart the API sent: { items: [...], count, total }


// ===== Messages =====

// What to do when an API request fails.
function handleError(error) {
  console.error(error);
  if (error.status === 401) {
    location.replace('login.html?next=cart.html');     // the login expired
    return;
  }
  showAlert(cartAlert, 'danger', error.message);
}


// ===== Showing the cart =====

// GET /api/cart, then shows it.
async function loadCart() {
  loading.hidden = false;
  try {
    const result = await apiFetch('/cart', 'GET', null, true);
    showCart(result.data);
  } catch (error) {
    handleError(error);
  }
  loading.hidden = true;
}

// Draws the cart lines and the totals from the API's answer.
function showCart(newCart) {
  cart = newCart;
  showCartCount(cart.count);              // the navbar badge
  cartLines.innerHTML = '';

  // Empty cart: show the "Browse products" message instead
  if (cart.items.length === 0) {
    emptyCart.hidden = false;
    cartContent.hidden = true;
    return;
  }
  emptyCart.hidden = true;
  cartContent.hidden = false;

  for (const item of cart.items) {
    cartLines.append(makeCartLine(item));
  }
  countText.textContent = cart.count;
  totalText.textContent = formatPeso(cart.total);
}

// Makes one line: photo, name and price, quantity box, line total, Remove.
// Inside it is a Bootstrap row: on phones the name has its own row; from 576px it's all one row.
function makeCartLine(item) {
  const photo = document.createElement('img');
  photo.src = productImage(item);
  photo.alt = '';
  photo.width = 64;
  photo.height = 48;
  photo.className = 'rounded thumb';

  const nameBox = makeElement('div');
  nameBox.append(
    makeElement('div', 'fw-semibold', item.name),
    makeElement('div', 'small text-body-secondary', formatPeso(item.price) + ' each')
  );
  const product = makeElement('div', 'd-flex align-items-center gap-2');
  product.append(photo, nameBox);

  // Quantity: when it changes, ask the API to update it
  const quantityBox = document.createElement('input');
  quantityBox.type = 'number';
  quantityBox.className = 'form-control form-control-sm qty-box';
  quantityBox.min = '1';
  quantityBox.max = item.stock;
  quantityBox.value = item.quantity;
  quantityBox.setAttribute('aria-label', 'Quantity of ' + item.name);
  quantityBox.addEventListener('change', function () {
    changeQuantity(item, quantityBox.value);
  });

  const lineTotal = makeElement('span', 'fw-semibold', formatPeso(item.line_total));

  const removeButton = makeElement('button', 'btn btn-link btn-sm text-danger', 'Remove');
  removeButton.type = 'button';
  removeButton.setAttribute('aria-label', 'Remove ' + item.name + ' from the cart');
  removeButton.addEventListener('click', function () {
    removeItem(item);
  });

  const row = makeElement('div', 'row g-2 align-items-center');
  const productColumn = makeElement('div', 'col-12 col-sm');
  productColumn.append(product);
  const quantityColumn = makeElement('div', 'col-auto');
  quantityColumn.append(quantityBox);
  const totalColumn = makeElement('div', 'col col-sm-auto text-end');
  totalColumn.append(lineTotal);
  const removeColumn = makeElement('div', 'col-auto');
  removeColumn.append(removeButton);
  row.append(productColumn, quantityColumn, totalColumn, removeColumn);

  const line = makeElement('li', 'list-group-item');
  line.append(row);
  return line;
}


// ===== Changing the cart =====

// PUT /api/cart/:product_id { quantity }
async function changeQuantity(item, typedValue) {
  cartAlert.hidden = true;
  const quantity = Number(typedValue);

  // Check it first; a wrong value puts the old quantity back
  if (!Number.isInteger(quantity) || quantity < 1) {
    showAlert(cartAlert, 'warning', 'Enter a whole number, 1 or more. To take an item out, click Remove.');
    showCart(cart);
    return;
  }

  try {
    const result = await apiFetch('/cart/' + item.product_id, 'PUT', { quantity: quantity }, true);
    showCart(result.data);
  } catch (error) {
    if (error.status === 422 && error.errors.quantity) {
      showAlert(cartAlert, 'warning', error.errors.quantity[0]);    // e.g. "Only 18 left of Bangus (1 kg)."
      showCart(cart);
    } else {
      handleError(error);
    }
  }
}

// DELETE /api/cart/:product_id
async function removeItem(item) {
  cartAlert.hidden = true;
  try {
    const result = await apiFetch('/cart/' + item.product_id, 'DELETE', null, true);
    showCart(result.data);
    showAlert(cartAlert, 'success', 'Removed ' + item.name + ' from your cart.');
    cartAlert.focus();
  } catch (error) {
    handleError(error);
  }
}


// ===== Checkout =====

// A field stops being red as soon as the user types in it
checkoutForm.addEventListener('input', function (event) {
  markField(event.target, '');
});

// "Place order": POST /api/orders { address, notes }
checkoutForm.addEventListener('submit', async function (event) {
  event.preventDefault();
  cartAlert.hidden = true;

  const address = addressField.value.trim();
  const notes = notesField.value.trim();

  // 1. Check the form (the same rules as the API; it checks again)
  let hasError = false;
  if (address.length < 5 || address.length > 200) {
    markField(addressField, 'Enter your delivery address (5 to 200 characters).');
    hasError = true;
  }
  if (notes.length > 200) {
    markField(notesField, 'Up to 200 characters.');
    hasError = true;
  }
  if (hasError) {
    checkoutForm.querySelector('.is-invalid').focus();
    return;
  }

  // 2. Send it. The server checks the stock again, works out the total, and empties the cart.
  placeOrderButton.disabled = true;
  placeOrderButton.textContent = 'Placing order…';
  try {
    const result = await apiFetch('/orders', 'POST', { address: address, notes: notes }, true);
    // 3. Go to "My orders", which shows a "thank you" message for this order
    location.href = 'orders.html?placed=' + result.data.id;
  } catch (error) {
    if (error.status === 422) {
      if (error.errors.cart) {
        // e.g. "Only 5 left of Bangus (1 kg)." (someone bought some meanwhile): show it and reload the cart
        showAlert(cartAlert, 'danger', error.errors.cart[0]);
        loadCart();
      } else {
        showServerErrors(error.errors);
      }
    } else {
      handleError(error);
    }
    placeOrderButton.disabled = false;
    placeOrderButton.textContent = 'Place order';
  }
});


// ===== Start =====
if (isCustomer) {
  loadCart();
}
