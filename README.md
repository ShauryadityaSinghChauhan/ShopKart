# ShopKart

A full-stack e-commerce application built as a series of labs: product discovery,
wishlist, cart, and a checkout that takes real payments through Razorpay.

The backend is a Node/Express REST API backed by MongoDB. The frontend is a
React single-page app that talks to it over JSON with a cookie-based session.

---

## Stack

| Layer | Technology |
| --- | --- |
| Backend | Node.js, Express 5, Mongoose 9 |
| Database | MongoDB (Atlas or local) |
| Auth | JWT in an `httpOnly` cookie, passwords hashed with bcrypt |
| Payments | Razorpay Standard Checkout (test mode) |
| Frontend | React 19, Vite 8, React Router 7 |
| Styling | Tailwind CSS 4 |
| HTTP client | axios |

---

## Features

- **Accounts** — register and log in with a name, email, phone and password.
  Passwords are hashed with bcrypt; the session is a JWT stored in an `httpOnly`
  cookie so client-side JavaScript cannot read it.
- **Product discovery** — browse the catalogue, search by name, filter by
  category, and sort by price or newest.
- **Wishlist** — save and unsave products, with a light `ids` endpoint so
  catalogue cards can render the correct button state without refetching every
  product.
- **Cart** — add, change quantity, and remove, with every change validated
  against live stock.
- **Checkout and orders** — a four-step payment flow that prices the cart on the
  server, collects payment in Razorpay's modal, verifies the payment signature,
  and only then clears the cart. Includes an order history and a per-order
  detail page.

---

## Repository layout

```
.
├── backend/
│   ├── config/razorpay.js          Lazily-resolved Razorpay client
│   ├── controllers/                Route handlers (user, product, wishlist, cart, order)
│   ├── middlewares/authMiddleware.js
│   ├── models/                     Mongoose schemas (User, Product, Order)
│   ├── routes/                     Express routers, one per resource
│   ├── utils/genToken.js           JWT signing
│   └── index.js                    App entry point + DB connection
├── frontend/
│   ├── vite-project/               The React app
│   │   └── src/
│   │       ├── axiosCalls/         Shared axios instance
│   │       ├── components/         Navbar, cards, forms, route guards
│   │       ├── context/            AuthContext, CartContext
│   │       ├── pages/              One file per route
│   │       ├── services/           All network calls, one module per resource
│   │       └── utils/              Validation and formatting helpers
│   └── viva-guide.html             Frontend walkthrough notes
└── lab06-checkout-orders.html      Lab notes for the checkout and orders work
```

---

## Getting started

### Prerequisites

- Node.js 18 or newer
- A MongoDB connection string (Atlas free tier works, or a local `mongod`)
- A Razorpay account in **Test Mode** for the checkout flow

### 1. Backend

```bash
cd backend
npm install
```

Create `backend/.env` with these four variables:

```dotenv
dbUrl=<your MongoDB connection string>
jwt_secret=<any long random string>
RAZORPAY_KEY_ID=<your test key id>
RAZORPAY_KEY_SECRET=<your test key secret>
```

The same key names are recorded in `backend/.env.example`, which is tracked in git
but currently deleted from the working tree. Restore it with
`git checkout backend/.env.example` if you want the template back.

Then start the server:

```bash
npx nodemon index.js     # development, restarts on change
node index.js            # plain start
```

`package.json` has no `start` script, so use one of the commands above. On
success the console prints `DB Connected` followed by
`Server Started at 3333`.

### 2. Frontend

```bash
cd frontend/vite-project
npm install
npm run dev
```

Open <http://localhost:5173>.

Other frontend scripts: `npm run build` (production bundle into `dist/`),
`npm run preview` (serve that bundle), `npm run lint`.

### 3. Confirm the two are talking

The frontend calls `http://localhost:3333` directly (set in
`src/axiosCalls/axios.js`) with `withCredentials: true` so the auth cookie rides
along. The backend's CORS config allows exactly one origin,
`http://localhost:5173`. If you run Vite on a different port, either put it back
on 5173 or update the `origin` in `backend/index.js` — otherwise every request
fails CORS and you will appear logged out while logged in.

To seed some products, `POST /products` with a JSON body:

```bash
curl -X POST http://localhost:3333/products \
  -H "Content-Type: application/json" \
  -d '{"name":"Mechanical Keyboard","description":"Hot-swappable, 75%","price":7499,"category":"Accessories","image":"https://example.com/kb.jpg","stock":10}'
```

---

## API reference

Base URL: `http://localhost:3333`

**Auth** column: `—` public, `cookie` requires the session cookie (or an
`Authorization: Bearer <token>` header).

### Customers — `/customers`

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/register` | — | Create an account. Requires `fullName`, `email`, `password`, `phone`; password at least 6 characters; email must be unique. |
| POST | `/login` | — | Exchange credentials for the session cookie. |
| GET | `/me` | cookie | The logged-in user's profile. |
| POST | `/logout` | cookie | Clear the session cookie. |

### Products — `/products`

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/` | — | List products. Optional query params: `search` (name, case-insensitive), `category` (exact, case-insensitive), `sort` (`price_asc`, `price_desc`; defaults to newest). |
| GET | `/:id` | — | One product, including its description. |
| POST | `/` | — | Create a product. Intended for seeding and admin use; validation is enforced by the schema. |

### Wishlist — `/wishlist`

Every route requires authentication; the token decides whose wishlist is read or
written. No route accepts a user id.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/` | The saved products, populated. |
| GET | `/ids` | Just the saved product ids — a light call for rendering button state on the catalogue. |
| POST | `/:productId` | Save a product. `409` if it is already saved. |
| DELETE | `/:productId` | Unsave a product. `404` if it was not saved. |
| PATCH | `/:productId/toggle` | Add if absent, remove if present. The response's `saved` field reports the resulting state. |

### Cart — `/cart`

Every route requires authentication. Each mutation responds with the **entire**
cart, so the client can replace its state from a single response.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/` | The current cart, with each product populated. |
| POST | `/:productId` | Add one unit. Creates the line at quantity 1, or increments an existing one. |
| PATCH | `/:productId` | Set an absolute quantity. Body: `{ "quantity": 3 }`. |
| DELETE | `/:productId` | Remove the line. |

Quantity is checked against live stock on every one of these calls, and rejected
with `400` if it would exceed it.

### Orders — `/orders`

Every route requires authentication.

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/create-payment-order` | Validate the cart, snapshot it into a `PENDING_PAYMENT` order, and open a Razorpay order. Body: `{ "shippingAddress": { ... } }`. |
| POST | `/verify-payment` | Verify the Razorpay signature. On success: mark the order `PAID`, set it to `PLACED`, and clear the cart. |
| GET | `/` | The caller's orders, newest first. |
| GET | `/:id` | One order. `404` if it does not exist *or* belongs to someone else. |

---

## How checkout works

The order of these four steps is the point of the whole flow.

1. **The server prices the cart.** `POST /orders/create-payment-order` sends only
   the shipping address. The server re-reads every product from the database,
   resolves current prices and stock, and computes the total itself. Any
   `totalAmount` in the request body is ignored — it is never read. The result is
   snapshotted into a `PENDING_PAYMENT` order, and Razorpay is asked to open an
   order for that amount.

2. **Razorpay collects the card.** The checkout modal loads from Razorpay's CDN on
   demand, so a visitor who never reaches checkout never downloads it. Card
   details go to Razorpay and never touch this application.

3. **The server verifies the signature.** The browser's success callback proves
   nothing on its own — it runs on the customer's machine. `POST
   /orders/verify-payment` recomputes an HMAC-SHA256 over
   `razorpayOrderId|razorpayPaymentId` using the Key Secret and compares it with
   `crypto.timingSafeEqual`. Only a request that carries a valid signature marks
   the order `PAID`.

4. **The cart is cleared.** This happens inside step 3, after verification — never
   before. Closing the Razorpay modal therefore leaves the cart exactly as it
   was, and a forged signature cannot empty someone's basket.

### Why orders copy the product name, price and image

A `Cart` line holds a *reference* to a product, so it always shows today's price.
An `Order` deliberately does the opposite: each item copies `name`, `price` and
`image` at the moment of purchase. What a customer paid must not change when the
shop later edits the product. The reference is kept alongside the copy so the
catalogue link survives.

### Test payments

Checkout only works when `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` are Test Mode
keys. Razorpay's own docs list the test cards and the UPI id that drive the
success, failure and retry paths:
<https://razorpay.com/docs/payments/payments/test-card-details/>. No real money
moves.

---

## Frontend routes

| Path | Guard | Page |
| --- | --- | --- |
| `/register`, `/login` | Public only — a logged-in visitor is redirected away | Auth forms |
| `/home` | Protected | Landing page |
| `/products` | Protected | Catalogue with search, filter and sort |
| `/products/:id` | Protected | Product detail, add to cart and wishlist |
| `/wishlist` | Protected | Saved products |
| `/cart` | Protected | Cart with quantity controls |
| `/checkout` | Protected | Address form and payment |
| `/orders` | Protected | Order history |
| `/orders/:id` | Protected | One order's detail |
| `/order-success/:id` | Protected | Confirmation, reached only by redirect after a verified payment |
| `*` | — | Redirects to `/login` |

`ProtectedRoute` waits for the session check to finish before deciding, so a
refresh on any page does not bounce the user to the login screen.

### State management

Two contexts, both in `src/context/`:

- **`AuthContext`** owns the logged-in user. On mount it calls `GET
  /customers/me` to see whether the cookie is still valid.
- **`CartContext`** owns the single client-side mirror of the server's cart. The
  backend is the source of truth — it enforces stock and survives a refresh — and
  every mutation replaces the mirror with the cart the server just returned, so
  the navbar badge, the cart page and the order summary can never disagree.

---

## Security notes

What the API does:

- Passwords are hashed with bcrypt (cost 10) and never returned in a response.
- The JWT lives in an `httpOnly` cookie, so it is not reachable from JavaScript.
- Ownership is derived from the verified token, never from a URL or body. There
  is no `GET /orders?userId=` and no `GET /cart/:userId` to abuse.
- `GET /orders/:id` answers `404` both for a missing order and for someone
  else's, so guessing an id reveals nothing.
- Product ids are validated as ObjectIds before reaching a query, turning what
  would be a `CastError` and a `500` into a clean `400`.
- Search input is regex-escaped before it is used in a query.
- The Razorpay Key Secret stays server-side. Only the Key ID — which is public by
  design — is sent to the browser.

Two things to fix before this goes anywhere real:

- **`backend/.env` is committed to git** and contains a live MongoDB password, the
  JWT secret and a Razorpay Key Secret. `.gitignore` does list `.env`, but git
  only applies that rule to files it is not already tracking, and this one is
  tracked. Removing it needs `git rm --cached backend/.env` — and every
  credential in it needs rotating, because it is already in the history.
- **The session cookie has no `secure` or `sameSite` attribute** (see
  `cookieOptions` in `backend/controllers/user.controllers.js`). That is fine over
  `localhost`, but a production deployment needs `secure: true` and an explicit
  `sameSite`.

---

