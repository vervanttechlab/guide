/*
 * register.js: the register page (register.html).
 * Checks the form in the browser, then sends POST /api/auth/register.
 * The API checks again; its errors (e.g. "The email has already been taken.")
 * are shown under the matching fields.
 * Uses the helper functions from api.js.
 */

const registerForm = document.getElementById('register-form');
const nameField = document.getElementById('name');
const emailField = document.getElementById('email');
const passwordField = document.getElementById('password');
const confirmField = document.getElementById('confirm');
const consentField = document.getElementById('consent');
const registerAlert = document.getElementById('register-alert');
const registerButton = document.getElementById('register-btn');

// true when a password has at least 8 characters, a letter and a number (the API's rule)
function isStrongPassword(password) {
  const hasLetter = /[A-Za-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  return password.length >= 8 && hasLetter && hasNumber;
}

// A field stops being red as soon as the user changes it
registerForm.addEventListener('input', function (event) {
  markField(event.target, '');
});

registerForm.addEventListener('submit', async function (event) {
  event.preventDefault();           // stay on this page (don't reload it)
  registerAlert.hidden = true;

  const name = nameField.value.trim();
  const email = emailField.value.trim();
  const password = passwordField.value;
  const role = registerForm.querySelector('input[name="role"]:checked').value;   // the ticked radio button

  // 1. Check every field in the browser first (the same rules as the API)
  let hasError = false;
  if (name.length < 2 || name.length > 60) {
    markField(nameField, 'Enter your name (2 to 60 characters).');
    hasError = true;
  }
  if (!isValidEmail(email)) {
    markField(emailField, 'Enter a valid email address.');
    hasError = true;
  }
  if (!isStrongPassword(password)) {
    markField(passwordField, 'Use at least 8 characters with a letter and a number.');
    hasError = true;
  }
  if (confirmField.value !== password) {
    markField(confirmField, "The passwords don't match.");
    hasError = true;
  }
  if (!consentField.checked) {
    markField(consentField, 'Please tick this box to continue.');
    hasError = true;
  }
  if (hasError) {
    registerForm.querySelector('.is-invalid').focus();
    return;
  }

  // 2. Send it to the API
  registerButton.disabled = true;
  registerButton.textContent = 'Creating account…';
  try {
    const newUser = { name: name, email: email, password: password, role: role };
    const result = await apiFetch('/auth/register', 'POST', newUser);
    saveSession(result);            // the API logs the new user in straight away

    if (role === 'seller') {
      location.href = 'seller.html';
    } else {
      location.href = 'index.html';
    }
  } catch (error) {
    if (error.status === 422) {
      // The API's "role" error goes under the first radio button
      showServerErrors(error.errors, { role: 'role-customer' });
    } else {
      showAlert(registerAlert, 'danger', error.message);
    }
    registerButton.disabled = false;
    registerButton.textContent = 'Create account';
  }
});
