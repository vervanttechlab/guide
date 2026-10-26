/*
 * api.js: shared code for every page of Palengke Online.
 * - talks to the back-end REST API (apiFetch)
 * - remembers who is logged in (saveSession, getSession, clearSession)
 * - fills the user area of the navbar (renderNavUser), including the cart count for customers
 * - small helpers used by the pages (makeElement, formatPeso, markField, showPagination, ...)
 * Every page loads this file first, before its own script.
 */

// ===== Settings =====

// The back-end's address. Keep ONE of these two lines:
// const API_BASE = "http://localhost:5501"; // Node.js API (provided/api-server)
const API_BASE = "http://localhost/palengke-api"; // PHP + MySQL API on XAMPP (provided/api-php)

const API_URL = API_BASE + "/api";

// ===== Login session =====
// After logging in, we keep the token and the user in sessionStorage.
// sessionStorage is emptied when the browser tab is closed.

// Saves the answer of a login or register request.
function saveSession(result) {
  const session = {
    token: result.token,
    expires_at: result.expires_at,
    user: result.user, // { id, name, email, role }
  };
  sessionStorage.setItem("session", JSON.stringify(session));
}

// Returns the saved session, or null when nobody is logged in or the token has expired.
function getSession() {
  const saved = sessionStorage.getItem("session");
  if (saved === null) {
    return null;
  }

  let session;
  try {
    session = JSON.parse(saved);
  } catch (error) {
    clearSession(); // the saved text was broken
    return null;
  }

  const expiresAt = new Date(session.expires_at);
  if (expiresAt < new Date()) {
    clearSession(); // the token is too old
    return null;
  }
  return session;
}

// Forgets the login.
function clearSession() {
  sessionStorage.removeItem("session");
}

// ===== Talking to the API =====

// Sends a request to the API and returns its answer as a JavaScript object.
//   path:     the part after /api, for example '/products?search=rice'
//   method:   'GET' (if left out), 'POST', 'PUT' or 'DELETE'
//   body:     data to send: an object (sent as JSON) or a FormData (for file uploads); or leave out
//   useToken: true to send the login token (needed for seller actions)
//
// When something goes wrong it throws an error with:
//   error.message  a text you can show to the user
//   error.status   the HTTP status, e.g. 401, 403, 422 (0 = the server could not be reached)
//   error.errors   the problems per form field, e.g. { email: ['The email has already been taken.'] }
async function apiFetch(path, method, body, useToken) {
  if (!method) {
    method = "GET";
  }
  const options = {
    method: method,
    headers: {},
  };

  if (body instanceof FormData) {
    // A form with a file: send it as it is.
    // Don't set Content-Type: the browser adds "multipart/form-data" with the right boundary.
    options.body = body;
  } else if (body) {
    // Normal data: send it as JSON text
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }

  if (useToken) {
    const session = getSession();
    if (session) {
      options.headers["Authorization"] = "Bearer " + session.token;
    }
  }

  let response;
  try {
    response = await fetch(API_URL + path, options);
  } catch (networkError) {
    // fetch() itself fails when the server is off or the address is wrong
    throw makeError(
      0,
      "Cannot reach the server. Please check that the API is running and try again.",
      {},
    );
  }

  // Turn the JSON answer into an object (a few answers have no body at all)
  let data = null;
  try {
    data = await response.json();
  } catch (error) {
    data = null;
  }

  // response.ok is false for status 400 and higher
  if (!response.ok) {
    if (response.status === 401 && useToken) {
      clearSession(); // the token is wrong or expired: log out here too
    }
    let message = "Request failed (HTTP " + response.status + ").";
    let errors = {};
    if (data && data.message) {
      message = data.message;
    }
    if (data && data.errors) {
      errors = data.errors;
    }
    throw makeError(response.status, message, errors);
  }

  return data;
}

// Creates an Error object that also carries the HTTP status and the field errors.
function makeError(status, message, errors) {
  const error = new Error(message);
  error.status = status;
  error.errors = errors;
  return error;
}

// ===== Helpers =====

// Creates an element with a class and some text, for example:
//   makeElement('p', 'card-text', 'Hello')  makes  <p class="card-text">Hello</p>
// The text is set with textContent, so it is never run as HTML (this blocks XSS).
function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) {
    element.className = className;
  }
  if (text !== undefined) {
    element.textContent = text;
  }
  return element;
}

// Full address of a product photo, or our own placeholder when the product has no photo.
function productImage(product) {
  if (product.image_url) {
    return API_BASE + product.image_url; // e.g. http://localhost:4000/uploads/mango.webp
  }
  return "images/no-image.webp";
}

// Shows money in pesos, for example 1250 -> "₱1,250.00".
function formatPeso(amount) {
  return (
    "₱" +
    amount.toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

// true when the text looks like an email address: something@something.something
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Marks a form field as wrong (red border, message under it) or as OK.
//   field:   the input element
//   message: the problem to show, or '' when the field is fine
// The message goes into the element whose id is the field's id + '-error',
// for example <div id="email-error" class="invalid-feedback">.
// Returns true when the field is wrong.
function markField(field, message) {
  if (message === "") {
    field.classList.remove("is-invalid");
    field.setAttribute("aria-invalid", "false");
    return false;
  }
  field.classList.add("is-invalid");
  field.setAttribute("aria-invalid", "true");
  const feedback = document.getElementById(field.id + "-error");
  if (feedback) {
    feedback.textContent = message;
  }
  return true;
}

// Shows the API's validation errors (status 422) under the matching form fields
// and puts the cursor in the first wrong field.
//   errors:  for example { email: ['The email has already been taken.'] }
//   renames: (optional) when an input's id is not the same as the API's field name,
//            for example { role: 'role-customer' }
function showServerErrors(errors, renames) {
  let firstField = null;
  for (const fieldName in errors) {
    let id = fieldName;
    if (renames && renames[fieldName]) {
      id = renames[fieldName];
    }
    const field = document.getElementById(id);
    if (field) {
      markField(field, errors[fieldName][0]); // show the first message for that field
      if (firstField === null) {
        firstField = field;
      }
    }
  }
  if (firstField) {
    firstField.focus();
  }
}

// Shows a Bootstrap alert inside an element.
//   type: 'success' (green), 'danger' (red), 'warning' (yellow) or 'info' (blue)
function showAlert(element, type, text) {
  element.className = "alert alert-" + type;
  element.textContent = text;
  element.hidden = false;
}

// Shows a short message in the corner (a Bootstrap toast), e.g. "Added to your cart."
// The page needs the toast markup: <div id="page-toast" class="toast"> ... <span id="page-toast-text">
//   isError: true for a red message, false for a green one
function showToast(text, isError) {
  const toast = document.getElementById("page-toast");
  if (!toast) {
    return;
  }
  document.getElementById("page-toast-text").textContent = text;
  if (isError) {
    toast.className = "toast text-bg-danger";
  } else {
    toast.className = "toast text-bg-success";
  }
  bootstrap.Toast.getOrCreateInstance(toast).show();
}

// Draws Bootstrap page buttons (Previous, 1, 2, ..., Next) into a <ul class="pagination">.
//   list:        the <ul> element
//   meta:        the API's { page, total_pages }
//   whenClicked: a function that receives the chosen page number
function showPagination(list, meta, whenClicked) {
  list.innerHTML = "";
  if (meta.total_pages <= 1) {
    return; // everything fits on one page: no buttons needed
  }
  addPageButton(
    list,
    "Previous",
    meta.page - 1,
    meta.page === 1,
    false,
    "Previous page",
    whenClicked,
  );
  for (let number = 1; number <= meta.total_pages; number++) {
    addPageButton(
      list,
      String(number),
      number,
      false,
      number === meta.page,
      "Page " + number,
      whenClicked,
    );
  }
  addPageButton(
    list,
    "Next",
    meta.page + 1,
    meta.page === meta.total_pages,
    false,
    "Next page",
    whenClicked,
  );
}

// Adds one page button to the list (used by showPagination).
function addPageButton(
  list,
  label,
  pageNumber,
  isDisabled,
  isActive,
  screenReaderLabel,
  whenClicked,
) {
  const item = makeElement("li", "page-item");
  if (isDisabled) {
    item.classList.add("disabled");
  }
  if (isActive) {
    item.classList.add("active");
  }
  const button = makeElement("button", "page-link", label);
  button.type = "button";
  button.disabled = isDisabled;
  button.setAttribute("aria-label", screenReaderLabel);
  if (isActive) {
    button.setAttribute("aria-current", "page");
  }
  button.addEventListener("click", function () {
    whenClicked(pageNumber);
  });
  item.append(button);
  list.append(item);
}

// Sends visitors to the login page unless they are logged in with the given role.
// Returns true when the visitor may stay on this page.
function requireRole(role) {
  const session = getSession();
  if (session && session.user.role === role) {
    return true;
  }
  const thisPage = location.pathname.split("/").pop(); // e.g. "seller.html"
  location.replace("login.html?next=" + thisPage);
  return false;
}

// ===== Navbar user area =====
// Every page has <div id="nav-user"> in its navbar.

// Shows "Log in" and "Register", or the user's name, role, "My products" (sellers) and "Log out".
function renderNavUser() {
  const area = document.getElementById("nav-user");
  if (!area) {
    return;
  }
  area.innerHTML = ""; // start empty (we add only our own elements below)
  const session = getSession();

  if (session === null) {
    const loginLink = makeElement(
      "a",
      "btn btn-outline-light btn-sm",
      "Log in",
    );
    loginLink.href = "login.html";
    const registerLink = makeElement("a", "btn btn-light btn-sm", "Register");
    registerLink.href = "register.html";
    area.append(loginLink, registerLink);
    return;
  }

  // "Hi, Maria Santos" + a yellow role badge
  const greeting = makeElement(
    "span",
    "navbar-text text-white",
    "Hi, " + session.user.name + " ",
  );
  const badge = makeElement(
    "span",
    "badge text-bg-warning text-capitalize",
    session.user.role,
  );
  greeting.append(badge);
  area.append(greeting);

  if (session.user.role === "seller") {
    const dashboardLink = makeElement(
      "a",
      "btn btn-outline-light btn-sm",
      "My products",
    );
    dashboardLink.href = "seller.html";
    area.append(dashboardLink);
  }

  if (session.user.role === "customer") {
    // "Cart" with the number of items, and "My orders"
    const cartLink = makeElement("a", "btn btn-outline-light btn-sm", "Cart ");
    cartLink.href = "cart.html";
    const cartBadge = makeElement("span", "badge text-bg-light", "0");
    cartBadge.id = "nav-cart-count";
    cartLink.append(cartBadge);
    const ordersLink = makeElement(
      "a",
      "btn btn-outline-light btn-sm",
      "My orders",
    );
    ordersLink.href = "orders.html";
    area.append(cartLink, ordersLink);
    loadCartCount();
  }

  const logoutButton = makeElement("button", "btn btn-light btn-sm", "Log out");
  logoutButton.type = "button";
  logoutButton.addEventListener("click", logOut);
  area.append(logoutButton);
}

// Asks the API how many items are in the cart, and shows it on the navbar badge.
async function loadCartCount() {
  try {
    const result = await apiFetch("/cart", "GET", null, true);
    showCartCount(result.data.count);
  } catch (error) {
    // Not important enough to show an error: the badge just stays as it is
  }
}

// Shows a number on the navbar's cart badge.
function showCartCount(count) {
  const badge = document.getElementById("nav-cart-count");
  if (badge) {
    badge.textContent = count;
  }
}

// Ends the token on the server, forgets it here, and goes back to the shop.
async function logOut() {
  try {
    await apiFetch("/auth/logout", "POST", null, true);
  } catch (error) {
    // Already logged out on the server: nothing to do
  }
  clearSession();
  location.href = "index.html";
}

renderNavUser();
