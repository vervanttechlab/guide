# How to run Palengke Online

Palengke Online is a small online market. Customers look at products, add them to a cart, check out and see their orders. Sellers manage their own products.

It has two parts:

- **The API** (the back-end) keeps the products, users, carts and orders. Use **one** of the two versions: Node.js (Option A) or PHP + MySQL on XAMPP (Option B). Both work exactly the same.
- **The website** (the front-end) is in `practice/palengke/solution/`. It runs in the browser and talks to the API.

The tutorial is `NC3-FRONTEND-TUTORIAL.html`: double-click it to open it in your browser (it works without internet). Choose your API (Node.js or PHP + XAMPP) in step S2 or at the top, and it shows only the steps for that API.

## What you need

- **VS Code** with the **Live Server** extension (by Ritwick Dey)
- **Node.js** (for Option A) or **XAMPP** (for Option B)
- A browser: Chrome, Edge or Firefox

## Step 1: Start the API

### Option A: Node.js

1. In VS Code: **File → Open Folder…** and choose `practice/palengke/provided/api-server`.
2. Open the **Run and Debug** panel on the left (Ctrl+Shift+D).
3. At the top, pick **Start API** and click the green ▶ button.
4. A terminal opens and says `Palengke Online API running at http://localhost:4000/api`. Leave this VS Code window open.

Check it: open <http://localhost:4000/api/health> in the browser. You should see `{"status":"ok",...}`.

- **Start API (reset sample data)** puts the sample data back. Use it before each practice.
- **Start API (slow: 1 second per answer)** makes the API slow on purpose, to see the loading spinners.
- To stop the API, click the red ■ square in the toolbar at the top of VS Code.

### Option B: PHP + MySQL on XAMPP

1. Open the XAMPP control panel and click **Start** next to **Apache** and **MySQL**.
2. Copy the folder `practice/palengke/provided/api-php` into XAMPP's `htdocs` folder and rename the copy **`palengke-api`**.
   - Windows: `C:\xampp\htdocs\palengke-api`
   - macOS: `/Applications/XAMPP/xamppfiles/htdocs/palengke-api`. Then let Apache save photos: in Finder, right-click the `uploads` folder inside it → **Get Info** → at the bottom, click the lock and set **everyone** to **Read & Write**.
3. Create the database: open <http://localhost/phpmyadmin>, click **Import**, choose `database.sql` from the `palengke-api` folder, and click **Import**. (Import it again any time to put the sample data back.)
4. Check it: open <http://localhost/palengke-api/api/health>. You should see `{"status":"ok",...}`.
5. Tell the website to use the PHP API: open `practice/palengke/solution/js/api.js`, and at the top put `//` in front of the first `API_BASE` line and remove the `//` from the second one:

   ```js
   // const API_BASE = 'http://localhost:4000';
   const API_BASE = 'http://localhost/palengke-api';
   ```

## Step 2: Open the website

1. In VS Code: **File → New Window**, then **File → Open Folder…** and choose `practice/palengke/solution`.
2. Right-click `index.html` and choose **Open with Live Server**.

Don't double-click `index.html`: the website must run on Live Server to talk to the API.

## Step 3: Log in and try it

| Role | Email | Password | What to try |
|---|---|---|---|
| Customer | `juan@example.com` | `Customer123` | Add to cart, change amounts, check out, open **My orders** |
| Seller | `maria@example.com` | `Seller123` | **My products**: search and filter, add a product with a photo, edit, delete |
| Seller | `pedro@example.com` | `Seller123` | A second seller (can't change Maria's products) |

You can also make a new account on the **Register** page.

## If something doesn't work

| You see | Do this |
|---|---|
| “Cannot reach the server” | The API isn't running. Do Step 1 again and open the health link. |
| Nothing loads and the address starts with `file://` | You double-clicked the file. Use **Open with Live Server**. |
| VS Code says “address already in use … 4000” | The API is already running in another VS Code window. Use that one, or stop it (red ■). |
| PHP: “Server error.” | MySQL isn't started, or `database.sql` wasn't imported. |
| PHP: every API address says “Not Found” | The folder in `htdocs` must be named exactly `palengke-api`. |
| Photo upload fails on macOS (PHP) | Give everyone Read & Write on the `uploads` folder (Option B, step 2). |

More fixes are in the tutorial, step **H1**.

## Bootstrap lab

Double-click `practice/bootstrap-lab/index.html` (no server needed). It has 18 live grid and flexbox demos (tutorial Phase L).

## What's in the folder

```
NC3-FrontEnd-Practice/
├── NC3-FRONTEND-TUTORIAL.html      the tutorial (open in the browser)
├── HOW-TO-RUN.md                   this file
├── practice/bootstrap-lab/         18 live Bootstrap grid and flexbox demos
└── practice/palengke/
    ├── provided/                   what the assessor would give you
    │   ├── BRIEF.md                the task
    │   ├── API.md, api.http        the API document and test requests
    │   ├── STYLE-GUIDE.md          colours and components
    │   ├── mockups/                13 page designs
    │   ├── api-server/             the API in Node.js (start it from Run and Debug)
    │   └── api-php/                the same API in PHP + MySQL (for XAMPP)
    └── solution/                   the finished website (HTML, CSS, JavaScript, Vue.js)
        └── docs/                   plan, review, test plan, risk assessment, performance
```
