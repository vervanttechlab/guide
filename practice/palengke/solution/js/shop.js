/*
 * shop.js: the shop page (index.html).
 * Loads the categories and the products from the API and shows the products as cards.
 * The shopper can search, pick a category, set a price range, sort, change pages,
 * open a product's details in a pop-up window (a Bootstrap modal), and add products to the cart.
 * Uses the helper functions from api.js.
 */

// ===== What the shopper has chosen =====
let search = '';
let categoryId = '';
let minPrice = '';
let maxPrice = '';
let sort = 'newest';
let page = 1;

// Category names by id, filled from the API, e.g. { 1: 'Vegetables', 2: 'Fruits' }.
// Products only carry a category_id, so we look the name up here.
const categoryNames = {};

// Who is looking: sellers can't buy, so they don't get "Add to cart" buttons
const session = getSession();
let canBuy = true;
if (session && session.user.role === 'seller') {
  canBuy = false;
}

// ===== Elements on the page =====
const grid = document.getElementById('product-grid');
const countText = document.getElementById('result-count');
const shopAlert = document.getElementById('shop-alert');
const loading = document.getElementById('loading');
const pagination = document.getElementById('pagination');
const filterForm = document.getElementById('filter-form');
const searchInput = document.getElementById('search');
const categorySelect = document.getElementById('category');
const minInput = document.getElementById('min-price');
const maxInput = document.getElementById('max-price');
const sortSelect = document.getElementById('sort');


// ===== Categories =====

// GET /api/categories: fills the category list and the categoryNames object.
async function loadCategories() {
  const result = await apiFetch('/categories');
  for (const category of result.data) {
    categoryNames[category.id] = category.name;

    const option = document.createElement('option');
    option.value = category.id;
    option.textContent = category.name;
    categorySelect.append(option);
  }
}

// The name of a product's category ("Other" if we don't know it).
function categoryOf(product) {
  const name = categoryNames[product.category_id];
  if (name) {
    return name;
  }
  return 'Other';
}


// ===== Products =====

// Builds the part after the "?" in the address, for example "page=1&sort=newest&search=rice".
// Empty choices are left out. encodeURIComponent() makes typed text safe inside an address.
function buildQuery() {
  let query = 'page=' + page + '&sort=' + sort;
  if (search !== '') {
    query = query + '&search=' + encodeURIComponent(search);
  }
  if (categoryId !== '') {
    query = query + '&category_id=' + categoryId;
  }
  if (minPrice !== '') {
    query = query + '&min_price=' + minPrice;
  }
  if (maxPrice !== '') {
    query = query + '&max_price=' + maxPrice;
  }
  return query;
}

// GET /api/products with the current choices, then shows the cards and the page buttons.
async function loadProducts() {
  shopAlert.hidden = true;
  loading.hidden = false;           // show the spinner
  grid.innerHTML = '';              // remove the old cards
  pagination.innerHTML = '';
  countText.textContent = '';

  try {
    const result = await apiFetch('/products?' + buildQuery());
    const products = result.data;   // the products of this page
    const meta = result.meta;       // { page, limit, total, total_pages }

    showProducts(products);
    showPagination(pagination, meta, goToPage);

    if (meta.total === 1) {
      countText.textContent = '1 product';
    } else {
      countText.textContent = meta.total + ' products';
    }
    if (products.length === 0) {
      showAlert(shopAlert, 'info', 'No products match. Try another word, category or price range.');
    }
  } catch (error) {
    console.error(error);
    showAlert(shopAlert, 'danger', error.message);
  }

  loading.hidden = true;            // hide the spinner
}

// A page button was clicked
function goToPage(pageNumber) {
  page = pageNumber;
  loadProducts();
  grid.scrollIntoView();            // back to the top of the products
}

// Makes one Bootstrap card per product and puts it in the grid.
function showProducts(products) {
  for (const product of products) {
    // Photo
    const image = document.createElement('img');
    image.className = 'card-img-top product-photo';
    image.src = productImage(product);
    image.alt = product.name;
    image.width = 600;
    image.height = 450;
    image.loading = 'lazy';

    // Category, name and seller
    const categoryBadge = makeElement('span', 'badge text-bg-light border align-self-start mb-2', categoryOf(product));
    const title = makeElement('h3', 'h6 card-title', product.name);
    const seller = makeElement('p', 'small text-body-secondary mb-2', 'by ' + product.seller_name);

    // Price and stock on one line
    const price = makeElement('span', 'fw-bold text-palengke', formatPeso(product.price));
    let stock;
    if (product.stock > 0) {
      stock = makeElement('span', 'badge text-bg-success', product.stock + ' in stock');
    } else {
      stock = makeElement('span', 'badge text-bg-danger', 'Out of stock');
    }
    const priceRow = makeElement('div', 'd-flex justify-content-between align-items-center mt-auto');
    priceRow.append(price, stock);

    // Buttons: "Details" and (for customers and visitors) "Add to cart"
    const buttonRow = makeElement('div', 'd-flex gap-2 mt-3');
    const detailsButton = makeElement('button', 'btn btn-outline-palengke btn-sm flex-fill', 'Details');
    detailsButton.type = 'button';
    detailsButton.setAttribute('aria-label', 'View details of ' + product.name);
    detailsButton.addEventListener('click', function () {
      showDetails(product.id);
    });
    buttonRow.append(detailsButton);

    if (canBuy) {
      const cartButton = makeElement('button', 'btn btn-palengke btn-sm flex-fill', 'Add to cart');
      cartButton.type = 'button';
      cartButton.setAttribute('aria-label', 'Add ' + product.name + ' to cart');
      if (product.stock === 0) {
        cartButton.disabled = true;
      }
      cartButton.addEventListener('click', function () {
        addToCart(product, 1);
      });
      buttonRow.append(cartButton);
    }

    // Put the card together: col > article.card > img + div.card-body
    const body = makeElement('div', 'card-body d-flex flex-column');
    body.append(categoryBadge, title, seller, priceRow, buttonRow);
    const card = makeElement('article', 'card h-100 shadow-sm');
    card.append(image, body);
    const column = makeElement('div', 'col');
    column.append(card);
    grid.append(column);
  }
}


// ===== Add to cart =====

// POST /api/cart. Visitors who aren't logged in go to the login page first.
// Returns true when it worked.
async function addToCart(product, quantity) {
  if (getSession() === null) {
    location.href = 'login.html?next=index.html';
    return false;
  }
  try {
    const result = await apiFetch('/cart', 'POST', { product_id: product.id, quantity: quantity }, true);
    showCartCount(result.data.count);
    showToast('Added ' + quantity + ' × ' + product.name + ' to your cart.', false);
    return true;
  } catch (error) {
    if (error.status === 401) {
      location.href = 'login.html?next=index.html';    // the login expired
      return false;
    }
    // e.g. "Only 18 left of Bangus (1 kg)." comes in error.errors.quantity
    if (error.errors.quantity) {
      showToast(error.errors.quantity[0], true);
    } else {
      showToast(error.message, true);
    }
    return false;
  }
}


// ===== Product details window =====
const productModal = document.getElementById('product-modal');
const buyArea = document.getElementById('pm-buy');
const quantityBox = document.getElementById('pm-qty');
const quantityError = document.getElementById('pm-qty-error');
const modalAddButton = document.getElementById('pm-add');
let productInWindow = null;       // the product shown in the details window

// GET /api/products/:id, fills the window, then opens it.
async function showDetails(id) {
  try {
    const result = await apiFetch('/products/' + id);
    const product = result.data;
    productInWindow = product;

    document.getElementById('product-modal-title').textContent = product.name;
    const image = document.getElementById('pm-image');
    image.src = productImage(product);
    image.alt = product.name;
    document.getElementById('pm-category').textContent = categoryOf(product);
    document.getElementById('pm-price').textContent = formatPeso(product.price);

    if (product.stock > 0) {
      document.getElementById('pm-stock').textContent = product.stock + ' in stock';
    } else {
      document.getElementById('pm-stock').textContent = 'Out of stock';
    }

    let description = product.description;
    if (!description) {
      description = 'No description yet.';
    }
    document.getElementById('pm-description').textContent = description;
    document.getElementById('pm-seller').textContent = product.seller_name;

    // The quantity box and "Add to cart" (not for sellers; disabled when out of stock)
    buyArea.hidden = !canBuy;
    quantityBox.value = '1';
    quantityBox.max = product.stock;
    quantityError.textContent = '';
    quantityBox.disabled = product.stock === 0;
    modalAddButton.disabled = product.stock === 0;

    // Open the Bootstrap modal
    bootstrap.Modal.getOrCreateInstance(productModal).show();
  } catch (error) {
    if (error.status === 404) {
      showAlert(shopAlert, 'danger', 'That product is no longer available.');
    } else {
      showAlert(shopAlert, 'danger', 'Could not load the product. Please try again.');
    }
  }
}

// "Add to cart" in the details window: check the quantity first
modalAddButton.addEventListener('click', async function () {
  const quantity = Number(quantityBox.value);
  if (!Number.isInteger(quantity) || quantity < 1) {
    quantityError.textContent = 'Enter a whole number, 1 or more.';
    return;
  }
  if (quantity > productInWindow.stock) {
    quantityError.textContent = 'Only ' + productInWindow.stock + ' in stock.';
    return;
  }
  quantityError.textContent = '';

  const added = await addToCart(productInWindow, quantity);
  if (added) {
    bootstrap.Modal.getOrCreateInstance(productModal).hide();
  }
});


// ===== Search and filters =====

// Reads the form, checks the price range, and loads the first page of results.
function applyFilters() {
  const min = minInput.value.trim();
  const max = maxInput.value.trim();

  if (min !== '' && max !== '' && Number(max) < Number(min)) {
    markField(maxInput, 'Max must be more than min.');
    return;                         // don't ask the API: the range is wrong
  }
  markField(maxInput, '');

  search = searchInput.value.trim();
  categoryId = categorySelect.value;
  minPrice = min;
  maxPrice = max;
  sort = sortSelect.value;
  page = 1;                         // new choices always start again at page 1
  loadProducts();
}

// The Apply button (submitting the form)
filterForm.addEventListener('submit', function (event) {
  event.preventDefault();           // stay on this page (don't reload it)
  applyFilters();
});

// Choosing a category or a sort order applies it straight away
categorySelect.addEventListener('change', applyFilters);
sortSelect.addEventListener('change', applyFilters);

// The Clear button empties the form and shows everything again
document.getElementById('clear-filters').addEventListener('click', function () {
  filterForm.reset();
  markField(maxInput, '');
  applyFilters();
});


// ===== Start =====
async function startPage() {
  try {
    await loadCategories();
  } catch (error) {
    console.error(error);           // the products can still load; their category shows "Other"
  }
  loadProducts();
}

startPage();
