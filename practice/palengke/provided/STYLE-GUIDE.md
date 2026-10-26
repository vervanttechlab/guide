# Palengke Online style guide (from the UI/UX designer)

## Layout

- Built on **Bootstrap 5** (grid, components). Content width: Bootstrap `.container`.
- Breakpoints: phones up to 767 px, tablets from 768 px, desktops from 992 px.
- Shop: filters in a left column (3 of 12) from 992 px; on smaller screens the filters fold behind a "Search and filters" button. Product cards: 1 per row on phones, 2 from 576 px, 3 from 1200 px.
- Login: one centred card (4 of 12 columns on desktops). Register: one centred card (6 of 12).
- Seller dashboard: four summary cards (2 per row on phones, 4 from 768 px), a search/filter row (search, category, stock, Search and Clear buttons), the product count, then the product table with page buttons under it (8 per page). On phones the filter fields stack, the Category column is hidden and the action buttons stack.
- Cart: the cart lines on the left (8 of 12) and an "Order summary" card with the checkout form on the right (4 of 12) from 992 px; on smaller screens the summary goes under the lines.
- My orders: one card per order, newest first, full width.

## Colours

| Name | Hex | Use |
|---|---|---|
| Palengke green | `#2e7d32` | navbar, main buttons, links in buttons, ticked checkboxes, active page |
| Dark green | `#1b5e20` | footer, button hover |
| Price orange | `#e65100` | prices |
| Page background | `#f4f7f1` | body |
| White | `#ffffff` | cards, table, forms |
| Stock badge | Bootstrap `success` / `danger` | "12 in stock" / "Out of stock" |
| Role badge | Bootstrap `warning` | "Seller" / "Customer" next to the name |

The hero band is a gradient from dark green to Palengke green (120°).

## Type

Bootstrap's default system fonts. Page title: `display`-size bold in the hero (h1). Section titles: h2 at `h4`/`h5` size. Prices: bold.

## Components

| Component | Notes |
|---|---|
| Navbar | brand "Palengke Online", link "Shop", user area on the right: Log in / Register; or for a customer "Hi, name" + role badge + **Cart** (with a white count badge) + **My orders** + Log out; or for a seller "Hi, name" + role badge + My products + Log out |
| Product card | photo 4:3, category badge, name, "by seller", price + stock badge on one line, then two buttons side by side: "Details" (green outline) and "Add to cart" (green; disabled when out of stock; not shown to sellers) |
| Add to cart message | a small toast at the bottom right: "Added 2 × Bibingka (2 pcs) to your cart." |
| Cart line | thumbnail, name and "₱70.00 each", quantity box, line total (bold), red "Remove" link |
| Order summary | card: Items, Total (price orange), delivery address (textarea), notes (optional), "Payment: cash on delivery.", full-width "Place order" button |
| Order card | header: "Order #2" on the left, date and green "Placed" badge on the right; a small table of items (Product, Price, Qty, Total); "Deliver to", notes, and the total in price orange |
| Product details | modal (large): photo left, details right; for customers a quantity box and "Add to cart" under the details |
| Forms | labels above fields, red border and message under the field when invalid |
| Buttons | green (main), green outline (secondary), red outline (delete) |
| Messages | Bootstrap alerts: green for success, red for errors, blue for information |
| Product form | modal; photo field is a file input with "JPG, PNG or WebP, up to 2 MB" help text and a small preview; when editing a product that has a photo, a "Remove the current photo" checkbox |
| Delete | small confirmation modal |
| Loading | a green Bootstrap spinner |

## Images

Product photos come from the API (`image_url`). When a product has no photo, show `images/no-image.webp` (provided with the front-end).
