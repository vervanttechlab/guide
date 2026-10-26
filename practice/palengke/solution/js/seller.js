/*
 * seller.js: the seller dashboard (seller.html).
 * Shows the seller's own products in a table (with search, filters and pages) and lets the seller
 * add, edit (with a photo) and delete them. Every request sends the login token.
 * After each change it tells the Vue summary to refresh (the "products-changed" event).
 * Uses the helper functions from api.js.
 */

// Only sellers may use this page; everyone else is sent to the login page
const isSeller = requireRole('seller');

// ===== Elements on the page =====
const productRows = document.getElementById('product-rows');
const sellerAlert = document.getElementById('seller-alert');
const loading = document.getElementById('loading');
const emptyNote = document.getElementById('empty-note');

// The add / edit window
const formModal = document.getElementById('product-form-modal');
const productForm = document.getElementById('product-form');
const formTitle = document.getElementById('form-title');
const formAlert = document.getElementById('form-alert');
const saveButton = document.getElementById('save-btn');
const nameField = document.getElementById('name');
const categoryField = document.getElementById('category_id');
const priceField = document.getElementById('price');
const stockField = document.getElementById('stock');
const imageField = document.getElementById('image');
const descriptionField = document.getElementById('description');
const preview = document.getElementById('image-preview');
const removeWrap = document.getElementById('remove-wrap');
const removeImageBox = document.getElementById('remove_image');

// The delete window
const deleteModal = document.getElementById('delete-modal');

// Search, filters and pages
const sellerFilterForm = document.getElementById('seller-filter-form');
const sellerSearch = document.getElementById('seller-search');
const sellerCategory = document.getElementById('seller-category');
const sellerStock = document.getElementById('seller-stock');
const sellerCount = document.getElementById('seller-count');
const sellerPagination = document.getElementById('seller-pagination');

// ===== Data =====
let products = [];                // the seller's products, from the API
const categoryNames = {};         // e.g. { 1: 'Vegetables' }
let editingId = null;             // null = adding a new product; a number = editing that product
let productToDelete = null;
let previewAddress = null;        // the temporary address of a chosen photo (see showPreview)

// What the seller is searching for
let search = '';
let categoryId = '';
let stockFilter = '';              // '' = all, 'in' = in stock, 'out' = out of stock
let page = 1;

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE = 2 * 1024 * 1024;   // 2 MB, the same limit as the API


// ===== Messages =====

// What to do when an API request fails.
//   box: where to show the message
function handleError(error, box) {
  console.error(error);
  if (error.status === 401) {
    location.replace('login.html?next=seller.html');   // the login expired
    return;
  }
  showAlert(box, 'danger', error.message);
}

// Shows a green message above the table and moves the keyboard focus to it.
function announce(text) {
  showAlert(sellerAlert, 'success', text);
  sellerAlert.focus();
}


// ===== Loading and showing the products =====

// GET /api/categories: fills the category lists (in the search bar and in the form).
async function loadCategories() {
  const result = await apiFetch('/categories');
  for (const category of result.data) {
    categoryNames[category.id] = category.name;

    const formOption = document.createElement('option');
    formOption.value = category.id;
    formOption.textContent = category.name;
    categoryField.append(formOption);

    const filterOption = document.createElement('option');
    filterOption.value = category.id;
    filterOption.textContent = category.name;
    sellerCategory.append(filterOption);
  }
}

// Builds the part after the "?", e.g. "page=1&sort=name&search=rice&stock=out"
function buildQuery() {
  let query = 'page=' + page + '&sort=name';
  if (search !== '') {
    query = query + '&search=' + encodeURIComponent(search);
  }
  if (categoryId !== '') {
    query = query + '&category_id=' + categoryId;
  }
  if (stockFilter !== '') {
    query = query + '&stock=' + stockFilter;
  }
  return query;
}

// true when the seller is searching or filtering (so "no products" means "none match")
function isFiltering() {
  return search !== '' || categoryId !== '' || stockFilter !== '';
}

// GET /api/seller/products with the search and filters (needs the token), then redraws the table.
async function loadProducts() {
  loading.hidden = false;
  try {
    const result = await apiFetch('/seller/products?' + buildQuery(), 'GET', null, true);
    products = result.data;
    const meta = result.meta;

    // A delete emptied the last page: go one page back
    if (products.length === 0 && page > 1) {
      page = page - 1;
      await loadProducts();
      return;
    }

    showRows();
    showPagination(sellerPagination, meta, function (pageNumber) {
      page = pageNumber;
      loadProducts();
    });
    if (meta.total === 1) {
      sellerCount.textContent = '1 product';
    } else {
      sellerCount.textContent = meta.total + ' products';
    }
  } catch (error) {
    handleError(error, sellerAlert);
  }
  loading.hidden = true;
}

// Makes a small button for a table row.
function makeRowButton(text, className, screenReaderLabel, onClick) {
  const button = makeElement('button', 'btn btn-sm ' + className, text);
  button.type = 'button';
  button.setAttribute('aria-label', screenReaderLabel);
  button.addEventListener('click', onClick);
  return button;
}

// One table row per product: photo + name, category, price, stock, Edit / Delete.
function showRows() {
  productRows.innerHTML = '';

  // Nothing to show: either no products at all, or none that match the search
  emptyNote.hidden = products.length > 0;
  if (isFiltering()) {
    emptyNote.textContent = 'No products match. Try another word, category or stock filter.';
  } else {
    emptyNote.textContent = 'You have no products yet. Click “Add product” to list your first one.';
  }

  for (const product of products) {
    // Product: small photo + name
    const thumbnail = document.createElement('img');
    thumbnail.src = productImage(product);
    thumbnail.alt = '';
    thumbnail.width = 48;
    thumbnail.height = 36;
    thumbnail.className = 'rounded thumb';
    const nameWrap = makeElement('div', 'd-flex align-items-center gap-2');
    nameWrap.append(thumbnail, makeElement('span', 'fw-semibold', product.name));
    const nameCell = makeElement('td');
    nameCell.append(nameWrap);

    // Category (hidden on phones to save space)
    let categoryName = categoryNames[product.category_id];
    if (!categoryName) {
      categoryName = 'Other';
    }
    const categoryCell = makeElement('td', 'd-none d-md-table-cell', categoryName);

    const priceCell = makeElement('td', 'text-end text-nowrap', formatPeso(product.price));

    // Stock: green number, or red "Out of stock"
    let stockBadge;
    if (product.stock > 0) {
      stockBadge = makeElement('span', 'badge text-bg-success', String(product.stock));
    } else {
      stockBadge = makeElement('span', 'badge text-bg-danger', 'Out of stock');
    }
    const stockCell = makeElement('td', 'text-end');
    stockCell.append(stockBadge);

    // Edit and Delete: stacked on phones, side by side from 576px
    const editButton = makeRowButton('Edit', 'btn-outline-palengke', 'Edit ' + product.name, function () {
      openForm(product);
    });
    const deleteButton = makeRowButton('Delete', 'btn-outline-danger', 'Delete ' + product.name, function () {
      askToDelete(product);
    });
    const buttons = makeElement('div', 'd-flex flex-column flex-sm-row justify-content-end gap-1');
    buttons.append(editButton, deleteButton);
    const actionsCell = makeElement('td');
    actionsCell.append(buttons);

    const row = makeElement('tr');
    row.append(nameCell, categoryCell, priceCell, stockCell, actionsCell);
    productRows.append(row);
  }
}


// ===== The photo field =====

// Shows a picture in the preview box.
// A chosen file gets a temporary "blob:" address from the browser; we free the old one first.
function showPreview(address) {
  if (previewAddress !== null) {
    URL.revokeObjectURL(previewAddress);
    previewAddress = null;
  }
  if (address.startsWith('blob:')) {
    previewAddress = address;
  }
  preview.src = address;
}

// Checks a chosen photo before uploading (the API checks again).
// Returns an error message, or '' when the photo is fine (or no photo was chosen).
function checkImage(file) {
  if (!file) {
    return '';
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return 'Choose a JPG, PNG or WebP image.';
  }
  if (file.size > MAX_IMAGE_SIZE) {
    return 'The image may not be larger than 2 MB.';
  }
  return '';
}

// When a photo is chosen: check it, then show it in the preview straight away
imageField.addEventListener('change', function () {
  const file = imageField.files[0];       // the chosen file (undefined if none)
  const problem = checkImage(file);
  markField(imageField, problem);
  if (problem !== '' || !file) {
    return;
  }
  removeImageBox.checked = false;
  showPreview(URL.createObjectURL(file));
});


// ===== Add / edit =====

// Opens the form window: empty to add a product, filled in to edit one.
//   product: the product to edit, or nothing to add a new one
function openForm(product) {
  productForm.reset();
  formAlert.hidden = true;
  const fields = [nameField, categoryField, priceField, stockField, imageField, descriptionField];
  for (const field of fields) {
    markField(field, '');
  }

  if (product) {
    editingId = product.id;
    formTitle.textContent = 'Edit ' + product.name;
    nameField.value = product.name;
    categoryField.value = product.category_id;
    priceField.value = product.price;
    stockField.value = product.stock;
    descriptionField.value = product.description;
    showPreview(productImage(product));
    removeWrap.hidden = !product.image_url;       // "Remove the current photo" only when it has one
  } else {
    editingId = null;
    formTitle.textContent = 'Add product';
    showPreview('images/no-image.webp');
    removeWrap.hidden = true;
  }

  bootstrap.Modal.getOrCreateInstance(formModal).show();
}

document.getElementById('add-btn').addEventListener('click', function () {
  openForm();
});

// When the window is fully open, put the cursor in the name field
formModal.addEventListener('shown.bs.modal', function () {
  nameField.focus();
});

// A field stops being red as soon as the user types in it
productForm.addEventListener('input', function (event) {
  markField(event.target, '');
});

productForm.addEventListener('submit', async function (event) {
  event.preventDefault();
  formAlert.hidden = true;

  const name = nameField.value.trim();
  const price = Number(priceField.value);
  const stock = Number(stockField.value);
  const file = imageField.files[0];

  // 1. Check the form (the same rules as the API; it checks again)
  let hasError = false;
  if (name.length < 3 || name.length > 80) {
    markField(nameField, 'Enter 3 to 80 characters.');
    hasError = true;
  }
  if (categoryField.value === '') {
    markField(categoryField, 'Choose a category.');
    hasError = true;
  }
  if (priceField.value === '' || price <= 0) {
    markField(priceField, 'Enter a price above 0.');
    hasError = true;
  }
  if (stockField.value === '' || !Number.isInteger(stock) || stock < 0) {
    markField(stockField, 'Enter a whole number, 0 or more.');
    hasError = true;
  }
  const imageProblem = checkImage(file);
  if (imageProblem !== '') {
    markField(imageField, imageProblem);
    hasError = true;
  }
  if (hasError) {
    productForm.querySelector('.is-invalid').focus();
    return;
  }

  // 2. Put the fields and the photo in a FormData ("multipart/form-data").
  //    The server saves the photo under a new random name (a UUID).
  const formData = new FormData();
  formData.append('name', name);
  formData.append('category_id', categoryField.value);
  formData.append('price', priceField.value);
  formData.append('stock', stockField.value);
  formData.append('description', descriptionField.value.trim());
  if (file) {
    formData.append('image', file);
  } else if (removeImageBox.checked) {
    formData.append('remove_image', 'true');
  }

  // Adding = POST /products. Editing = POST /products/:id with _method=PUT,
  // because PHP only reads uploaded files on POST (the Node API accepts this too).
  let path = '/products';
  if (editingId !== null) {
    path = '/products/' + editingId;
    formData.append('_method', 'PUT');
  }

  // 3. Send it
  saveButton.disabled = true;
  try {
    const result = await apiFetch(path, 'POST', formData, true);
    bootstrap.Modal.getOrCreateInstance(formModal).hide();
    await loadProducts();
    window.dispatchEvent(new Event('products-changed'));   // tell the Vue summary
    announce(result.message + ' ' + result.data.name);
  } catch (error) {
    if (error.status === 422) {
      showServerErrors(error.errors);
    } else {
      handleError(error, formAlert);
    }
  }
  saveButton.disabled = false;
});


// ===== Delete =====

// Opens the "Delete product?" window.
function askToDelete(product) {
  productToDelete = product;
  document.getElementById('delete-name').textContent = product.name;
  bootstrap.Modal.getOrCreateInstance(deleteModal).show();
}

// The red Delete button in that window: DELETE /api/products/:id
document.getElementById('confirm-delete').addEventListener('click', async function () {
  if (productToDelete === null) {
    return;
  }
  const product = productToDelete;
  productToDelete = null;
  bootstrap.Modal.getOrCreateInstance(deleteModal).hide();

  try {
    await apiFetch('/products/' + product.id, 'DELETE', null, true);
    await loadProducts();
    window.dispatchEvent(new Event('products-changed'));
    announce('Deleted ' + product.name + '.');
  } catch (error) {
    handleError(error, sellerAlert);
  }
});

// Before a window closes, take the focus off its buttons (avoids a warning in Chrome)
formModal.addEventListener('hide.bs.modal', function () {
  document.activeElement.blur();
});
deleteModal.addEventListener('hide.bs.modal', function () {
  document.activeElement.blur();
});


// ===== Search and filters =====

// Reads the search bar and shows the first page of results
function applyFilters() {
  search = sellerSearch.value.trim();
  categoryId = sellerCategory.value;
  stockFilter = sellerStock.value;
  page = 1;
  loadProducts();
}

sellerFilterForm.addEventListener('submit', function (event) {
  event.preventDefault();
  applyFilters();
});
sellerCategory.addEventListener('change', applyFilters);
sellerStock.addEventListener('change', applyFilters);

document.getElementById('seller-clear').addEventListener('click', function () {
  sellerFilterForm.reset();
  applyFilters();
});


// ===== Start =====
async function startPage() {
  try {
    await loadCategories();
  } catch (error) {
    handleError(error, sellerAlert);
  }
  loadProducts();
}

if (isSeller) {
  startPage();
}
