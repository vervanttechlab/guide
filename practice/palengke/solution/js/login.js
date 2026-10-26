/*
 * login.js: the login page (login.html).
 * Checks the form, sends POST /api/auth/login, saves the token,
 * then opens the right page: sellers go to their products, customers to the shop.
 * Uses the helper functions from api.js.
 */

const loginForm = document.getElementById('login-form');
const emailField = document.getElementById('email');
const passwordField = document.getElementById('password');
const loginAlert = document.getElementById('login-alert');
const loginButton = document.getElementById('login-btn');

// After logging in, go back to the page that sent us here (login.html?next=cart.html),
// but only to our own pages that fit the role, so a link can't send the user to another website.
const pagesForSellers = ['index.html', 'seller.html'];
const pagesForCustomers = ['index.html', 'cart.html', 'orders.html'];
const nextPage = new URLSearchParams(location.search).get('next');   // the value after ?next=

// A field stops being red as soon as the user types in it
loginForm.addEventListener('input', function (event) {
  markField(event.target, '');
});

loginForm.addEventListener('submit', async function (event) {
  event.preventDefault();           // stay on this page (don't reload it)
  loginAlert.hidden = true;

  const email = emailField.value.trim();
  const password = passwordField.value;

  // 1. Check the form in the browser first
  let hasError = false;
  if (!isValidEmail(email)) {
    markField(emailField, 'Enter a valid email address.');
    hasError = true;
  }
  if (password === '') {
    markField(passwordField, 'Enter your password.');
    hasError = true;
  }
  if (hasError) {
    loginForm.querySelector('.is-invalid').focus();
    return;
  }

  // 2. Send it to the API
  loginButton.disabled = true;      // can't be clicked twice while waiting
  loginButton.textContent = 'Logging in…';
  try {
    const result = await apiFetch('/auth/login', 'POST', { email: email, password: password });
    saveSession(result);

    // 3. Go to the next page: the one we came from (if it fits the role), else the role's home page
    let allowedPages = pagesForCustomers;
    let homePage = 'index.html';
    if (result.user.role === 'seller') {
      allowedPages = pagesForSellers;
      homePage = 'seller.html';
    }
    if (allowedPages.includes(nextPage)) {
      location.href = nextPage;
    } else {
      location.href = homePage;
    }
  } catch (error) {
    if (error.status === 422) {
      showServerErrors(error.errors);
    } else {
      showAlert(loginAlert, 'danger', error.message);    // e.g. "Invalid email or password."
    }
    passwordField.value = '';
    loginButton.disabled = false;
    loginButton.textContent = 'Log in';
  }
});

// Already logged in? Say so above the form
const currentSession = getSession();
if (currentSession) {
  showAlert(loginAlert, 'info', 'You are logged in as ' + currentSession.user.name + ' (' + currentSession.user.role + ').');
}
