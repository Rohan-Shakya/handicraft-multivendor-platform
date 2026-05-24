# Route Model

## Purpose

This document defines the canonical route model for the storefront and API surfaces.

Because this project uses:

- global storefront routes
- top-level vendor landing routes
- customer account routes under `/customer/...`

route design must stay consistent and conflict-free.

---

## Routing Principle

This platform follows three routing rules:

1. global catalog and content routes use explicit prefixes
2. vendor landing pages use top-level slugs
3. customer account routes use `/customer/...`

This keeps the storefront readable while preserving vendor branding and avoiding routing ambiguity.

---

## Public Storefront Routes

### Home

- `/`

---

### Products

Canonical product route:

- `/products/:handle`

Examples:

- `/products/running-shoe-x`
- `/products/leather-bag-pro`

Products are globally routed, not vendor-nested by default.

---

### Collections

Canonical collection route:

- `/collections/:handle`

Examples:

- `/collections/shoes`
- `/collections/clothes`
- `/collections/sale`
- `/collections/new-arrivals`

Collections are global storefront resources, not vendor-owned resources.

---

### Pages

Canonical page route:

- `/pages/:handle`

Examples:

- `/pages/about-us`
- `/pages/contact`
- `/pages/faq`

Pages are admin-owned CMS resources.

---

### Blogs

Simplest canonical blog route:

- `/blogs/:handle`

Examples:

- `/blogs/how-to-clean-running-shoes`
- `/blogs/top-10-summer-fashion-tips`

If blog container and post routes are separated later, one possible structure is:

- `/blogs/:blogHandle`
- `/blogs/:blogHandle/:postHandle`

Only add nested blog routes if the blog model truly requires it.

---

### Vendor Landing Pages

Canonical vendor landing route:

- `/:vendorSlug`

Examples:

- `/daraz`
- `/nike`
- `/adidas`

This is a top-level route.

Because of this, reserved top-level paths must be protected carefully.

---

## Customer Routes

Canonical customer route group:

- `/customer/...`

Examples:

- `/customer/login`
- `/customer/register`
- `/customer/reset-password`
- `/customer/account`
- `/customer/orders`
- `/customer/orders/:orderNumber`

This route group is singular by design and should remain consistent across storefront and API usage.

---

## Cart and Wishlist Routes

These are global customer-facing storefront routes:

- `/cart`
- `/wishlist`

Examples:

- `/cart`
- `/wishlist`

These should not be nested under vendor routes or customer profile routes by default.

---

## Product Review Routes

Review functionality is tied to products and customers.

### Storefront Review Read Routes

- `/products/:handle`
- `/products/:handle/reviews` optional if review pages are separated

### Customer Review Write Flows

These are usually action-based through API rather than standalone pages, but if UI pages are used later they may follow:

- `/customer/reviews`
- `/customer/reviews/:reviewId`

Only add dedicated customer review pages if there is a clear UX need.

---

## Optional Future Vendor Routes

If needed later, vendor subroutes may include:

- `/:vendorSlug/products`
- `/:vendorSlug/about`
- `/:vendorSlug/reviews`

These should only be added carefully to avoid route conflicts and complexity.

The canonical vendor route remains:

- `/:vendorSlug`

---

## Reserved Top-Level Routes

The following top-level paths must remain reserved and may not be used as vendor slugs:

- `products`
- `collections`
- `pages`
- `blogs`
- `customer`
- `cart`
- `wishlist`
- `api`
- `admin`
- `vendor`
- `auth`
- `search`
- `favicon.ico`
- `robots.txt`
- `sitemap.xml`

Any vendor slug validation must reject reserved values.

---

## Canonical Route Rules

### Product Route Rule

Correct:

- `/products/:handle`

Incorrect by default:

- `/:vendorSlug/products/:handle`

Vendor identity should be represented by storefront data and vendor landing pages, not by forcing product URLs under vendor slugs unless explicitly requested.

### Collection Route Rule

Correct:

- `/collections/:handle`

Incorrect by default:

- `/:vendorSlug/collections/:handle`

Collections are admin-owned global storefront structures.

### Page Route Rule

Correct:

- `/pages/:handle`

Pages are global, not vendor-scoped by default.

### Blog Route Rule

Correct:

- `/blogs/:handle`

Blogs and blog posts are global editorial resources by default.

### Customer Route Rule

Correct:

- `/customer/login`
- `/customer/register`
- `/customer/account`

Incorrect for this repository:

- `/customers/login`
- `/customers/account`

Use singular `customer` consistently.

---

## Storefront Route Summary

```text
/
/products/:handle
/collections/:handle
/pages/:handle
/blogs/:handle
/cart
/wishlist
/customer/login
/customer/register
/customer/reset-password
/customer/account
/customer/orders
/customer/orders/:orderNumber
/:vendorSlug
```

---

## API Route Groups

### Admin API

- `/admin/...`

Examples:

- `/admin/users`
- `/admin/vendors`
- `/admin/products`
- `/admin/collections`
- `/admin/pages`
- `/admin/blogs`
- `/admin/blog-posts`
- `/admin/reviews`
- `/admin/customers`
- `/admin/orders`

### Vendor API

- `/vendor/...`

Examples:

- `/vendor/me`
- `/vendor/products`
- `/vendor/products/:id`
- `/vendor/products/:id/options`
- `/vendor/products/:id/metafields`
- `/vendor/products/:id/variants`
- `/vendor/variants/:id`
- `/vendor/variants/:id/metafields`
- `/vendor/order-items`
- `/vendor/order-items/:id`
- `/vendor/order-items/:id/status`

### Storefront API

- `/storefront/...`

Examples:

- `/storefront/products`
- `/storefront/products/:handle`
- `/storefront/collections/:handle`
- `/storefront/pages/:handle`
- `/storefront/blogs/:handle`
- `/storefront/vendors/:vendorSlug`
- `/storefront/search`
- `/storefront/products/:handle/reviews`

### Customer/Auth API

- `/auth/customer/...`
- `/customer/...`

Examples:

- `/auth/customer/login`
- `/auth/customer/register`
- `/auth/customer/reset-password`
- `/customer/me`
- `/customer/me/orders`
- `/customer/me/wishlist`
- `/customer/me/cart`
- `/customer/products/:productId/reviews`

---

## Route Conflict Rules

Before adding a new route, check:

1. does it conflict with top-level vendor slug routing?
2. does it conflict with reserved paths?
3. is it canonical or merely optional?
4. is it storefront, admin, vendor, or customer scope?
5. does it accidentally create a second competing URL model for the same resource?

---

## SEO and Canonical URL Notes

To avoid duplication:

- every product should have one canonical product URL
- every collection should have one canonical collection URL
- every page should have one canonical page URL
- every vendor should have one canonical vendor landing URL

Do not create alternative vendor-prefixed product URLs unless there is a deliberate SEO and routing strategy.

---

## Final Routing Principle

> Global content gets explicit route prefixes. Vendors get top-level landing routes. Customer account routes use `/customer/...`. Products remain globally routed.
