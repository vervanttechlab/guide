/*
 * vue-summary.js: the inventory summary on the seller dashboard, built with Vue.js 3.
 * (The assessment asks for one part made with a JavaScript framework; this is it.)
 *
 * It shows 4 numbers about ALL the seller's products: products, units in stock,
 * stock value, and how many are out of stock. It reads GET /api/seller/summary
 * with apiFetch() from api.js, and refreshes when seller.js says "products-changed".
 * (The product table shows one page at a time, so the totals come from the API.)
 *
 * We build the HTML with Vue's h() function instead of a template:
 *   h('p', { class: 'fs-4' }, 'Hello')   makes   <p class="fs-4">Hello</p>
 * A Vue template would need 'unsafe-eval' in our Content Security Policy; h() doesn't.
 *
 * Vue comes from the Cloudflare CDN; when that fails (no internet) we load vendor/vue.global.prod.js.
 */

// Builds the Vue app. Runs once Vue has loaded.
function startVueSummary() {
  if (getSession() === null) {
    return;                         // not logged in: seller.js is sending the visitor to the login page
  }

  // The Vue functions we use
  const createApp = Vue.createApp;
  const ref = Vue.ref;              // a value that Vue watches: when it changes, the page updates
  const computed = Vue.computed;    // a value worked out from other values, updated automatically
  const onMounted = Vue.onMounted;  // runs code once the app is on the page
  const h = Vue.h;                  // builds HTML elements

  const app = createApp({
    setup: function () {
      const summary = ref(null);    // { products, units, stock_value, out_of_stock } from the API
      const errorText = ref('');

      // Loads the totals again from the API
      async function refresh() {
        try {
          const result = await apiFetch('/seller/summary', 'GET', null, true);
          summary.value = result.data;
          errorText.value = '';
        } catch (error) {
          errorText.value = 'Summary unavailable.';
        }
      }

      onMounted(function () {
        refresh();
        window.addEventListener('products-changed', refresh);   // seller.js sends this after each change
      });

      // A short sentence under the cards, worked out from the summary.
      // computed() makes Vue update it automatically whenever summary changes.
      const stockNote = computed(function () {
        if (summary.value === null) {
          return '';
        }
        if (summary.value.out_of_stock === 0) {
          return 'Everything is in stock.';
        }
        if (summary.value.out_of_stock === 1) {
          return '1 product is out of stock: add stock so customers can buy it.';
        }
        return summary.value.out_of_stock + ' products are out of stock: add stock so customers can buy them.';
      });

      // One Bootstrap card with a label and a big number.
      // col-6 col-md-3 = 2 cards per row on phones, 4 per row from 768px.
      function statCard(label, value) {
        return h('div', { class: 'col-6 col-md-3' }, [
          h('div', { class: 'card h-100 text-center' }, [
            h('div', { class: 'card-body' }, [
              h('p', { class: 'text-body-secondary small mb-1' }, label),
              h('p', { class: 'fs-4 fw-bold mb-0' }, value)
            ])
          ])
        ]);
      }

      // What Vue shows. Vue runs this again whenever a value above changes.
      return function render() {
        if (errorText.value !== '') {
          return h('p', { class: 'text-body-secondary' }, errorText.value);
        }
        if (summary.value === null) {
          return h('p', { class: 'text-body-secondary' }, 'Loading summary…');   // no fake zeros while loading
        }
        return h('div', [
          h('div', { class: 'row g-3' }, [
            statCard('Products', String(summary.value.products)),
            statCard('Units in stock', String(summary.value.units)),
            statCard('Stock value', formatPeso(summary.value.stock_value)),
            statCard('Out of stock', String(summary.value.out_of_stock))
          ]),
          h('p', { class: 'small text-body-secondary mt-2 mb-0' }, stockNote.value)
        ]);
      };
    }
  });

  app.mount('#inventory-summary');  // put the app inside <section id="inventory-summary">
}

// If the CDN copy of Vue loaded, start now; otherwise load our local copy first, then start.
if (window.Vue) {
  startVueSummary();
} else {
  const script = document.createElement('script');
  script.src = 'vendor/vue.global.prod.js';
  script.addEventListener('load', startVueSummary);
  document.head.append(script);
}
