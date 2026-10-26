# Palengke Online: integration practice

A practice assessment that matches the expected format: **you get a mockup (images) and a ready-made REST API, and you build the front-end that connects them.**

```
palengke/
├── provided/            what the assessor hands you
│   ├── BRIEF.md         the task
│   ├── API.md           API documentation (back-end team)
│   ├── api.http         example requests (REST Client)
│   ├── STYLE-GUIDE.md   colours, layout, components (designer)
│   ├── mockups/         13 PNG designs (shop, login, register, cart, orders, seller; desktop and mobile)
│   ├── api-server/      the API in Node.js: node server.js (no install needed)
│   └── api-php/         the same API in PHP + MySQL for XAMPP (see api-php/README.md)
└── solution/            a finished front-end to compare with (open it only after trying)
```

## Drill (about 6 hours, Wi-Fi off)

1. **Start the API**, either one (they behave the same):
   - **Node:** `cd provided/api-server` then `node server.js`. Leave it running. (`node server.js --reset` restores the sample data.)
   - **PHP + MySQL (XAMPP):** follow `provided/api-php/README.md`, then set `API_BASE` in your `js/api.js` to `http://localhost/palengke-api`.
2. **Read** `BRIEF.md`, `API.md` and `STYLE-GUIDE.md`; open every mockup.
3. **Test the API before coding:** open `provided/api.http` in VS Code and send each request. Note the field names, the wrapped `{ data }` answers and every error status.
4. **Build** your front-end in a new empty folder (copy `vendor/` and `images/no-image.webp` from `solution/`). Open it with Live Server.
5. **Compare** with the mockups at 375, 768 and 1280 px, then with `solution/`.

## Run the finished solution

1. Start the API (step 1 above).
2. Open `solution/index.html` with **Live Server** (not by double-clicking).
3. Log in as a seller: `maria@example.com` / `Seller123`, or a customer: `juan@example.com` / `Customer123`.

## What the finished site does

| Who | Can |
|---|---|
| Visitor | browse, search, filter, sort and page through products; open details; register; log in ("Add to cart" sends them to log in first) |
| Customer | everything a visitor can, plus **add to cart** (cards and details window), change quantities, remove items, **check out** (address + notes, cash on delivery) and see **My orders** |
| Seller | the **seller dashboard**: inventory totals (Vue.js), **search / category / stock filters with pages**, add, edit (with photo upload) and delete their own products |
