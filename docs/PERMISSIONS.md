# Permissions Matrix

## Purpose

This document defines permission behavior across admin, vendor-scoped actors, and customers.

This project depends on **strict ownership boundaries**, so permissions must be explicit, testable, and enforced on the backend.

---

## Core Permission Principle

This platform follows one central rule:

> Admin governs the platform. Vendor-scoped actors govern only their own catalog and order-item scope. Customers govern only their own account-facing resources.

This means:

- admin controls global resources and governance
- vendors control only their own catalog and vendor-specific operational data
- customers control only their own account, cart, wishlist, and reviews within policy

---

## Actor Types

### Admin Actors

- `super_admin`
- `store_admin`
- `catalog_manager`
- `content_manager`
- `support_agent`

### Vendor-Scoped Actors

These are actors with vendor-limited operational permissions.

Important:

- vendors do not manage users
- vendor-scoped actors are still admin-governed in lifecycle and access setup
- vendor-scoped access must always be ownership-checked

### Customer Actor

- `customer`

---

## Permission Design Rules

### Rule 1: Backend Is Source of Truth

Frontend visibility is not enough.

All permissions must be enforced in backend services and policies.

---

### Rule 2: Ownership Check Required for Vendor Writes

If a vendor-scoped actor attempts to modify a resource, backend must verify:

- the resource belongs to the actor’s vendor scope
- the resource is vendor-manageable
- the action is allowed by the actor’s role
- the vendor is active if that concept exists

---

### Rule 3: Global Content Is Admin-Only by Default

Collections, pages, blogs, blog posts, and themes are admin-managed unless explicitly opened through a controlled workflow.

---

### Rule 4: Orders Must Be Scoped Properly

Customers see only their own orders.

Admin sees full orders.

Vendor-scoped actors see only their own order items and vendor-relevant operational details.

---

### Rule 5: Vendors Never Manage Users

No vendor-scoped actor should be allowed to:

- create users
- update users globally
- delete users
- assign user roles globally

User lifecycle is admin-only.

---

### Rule 6: Customer Scope Is Self-Only

Customers may only act on:

- their own profile
- their own addresses
- their own cart
- their own wishlist
- their own orders
- their own reviews

No customer action should expose other customers’ data.

---

## Capability Matrix

## Admin Permissions

### `super_admin`

Can:

- manage users
- manage vendors
- manage products across all vendors
- manage product options across all vendors
- manage variants across all vendors
- manage collections
- manage pages
- manage blogs
- manage blog posts
- manage customers
- view and manage all orders
- manage reviews and moderation rules
- manage themes
- manage global settings
- override workflows
- access full platform administration

---

### `store_admin`

Can generally do most operational admin actions, including:

- manage users
- manage vendors
- manage products across vendors
- manage product options across vendors
- manage variants across vendors
- manage collections
- manage pages
- manage blogs
- manage blog posts
- manage customers
- view full orders
- manage reviews
- manage global storefront operations

May be restricted from certain highest-level platform actions depending on implementation.

---

### `catalog_manager`

Can:

- view all vendors
- view all products
- view all product options
- view all variants
- manage products where admin override is allowed
- manage collections
- manage merchandising rules
- manage product visibility and publication
- review catalog consistency

Cannot typically manage users unless explicitly allowed.

---

### `content_manager`

Can:

- manage pages
- manage blogs
- manage blog posts
- manage collection editorial content
- manage SEO content for admin-owned resources
- help manage storefront presentation content

Cannot typically manage users or vendor operations unless explicitly allowed.

---

### `support_agent`

Can typically:

- view customers
- view orders
- view vendor information
- assist operational workflows
- view reviews if support requires it
- leave internal notes if supported

Usually should not manage catalog structure or users unless explicitly allowed.

---

## Vendor-Scoped Permissions

Vendor-scoped actors can act only within their own vendor scope.

### Allowed Actions

Vendor-scoped actors may:

- create own products
- update own products
- update own product details
- manage own product options
- manage own product option values
- manage own product metafields
- create own variants
- update own variants
- update own variant details
- manage own variant metafields
- update own price
- update own stock
- manage own vendor landing page settings
- view reviews for own products if allowed
- manage statuses for own order items

### Disallowed Actions

Vendor-scoped actors may not:

- manage users
- manage vendors globally
- manage collections
- manage pages
- manage blogs
- manage blog posts
- manage themes
- manage global navigation
- manage global SEO defaults
- access other vendors’ products
- access other vendors’ variants
- access unrelated order items
- access full multi-vendor order internals unless explicitly allowed by policy
- moderate global review policy by default

---

## Customer Permissions

Customers may:

- register
- login
- reset password
- manage own profile
- manage own addresses
- manage own wishlist
- manage own cart
- view own orders
- view own order details
- create own product reviews
- edit or delete own reviews if policy allows

Customers may not:

- manage vendors
- manage products
- manage product options
- manage variants
- manage collections
- manage content resources
- access admin APIs
- access vendor APIs
- access another customer’s data

---

## Resource-Level Permission Matrix

## Users

### Admin

- full management allowed based on role

### Vendor-Scoped

- not allowed

### Customer

- only own authentication and account-facing flows

---

## Vendors

### Admin

- create, read, update, govern

### Vendor-Scoped

- may view own vendor data and update allowed vendor landing page settings
- may not govern vendors globally

### Customer

- read-only public storefront exposure where published

---

## Products

### Admin

- view all
- moderate and override based on policy
- manage publication and governance if desired

### Vendor-Scoped

- create own
- read own
- update own
- manage own metafields
- manage own options

### Customer

- read published products only

---

## Product Options

### Admin

- view all
- override or inspect where policy allows

### Vendor-Scoped

- create and update own product options
- create and update own option values

### Customer

- read only as part of the storefront product selection experience

---

## Variants

### Admin

- view all
- override where policy allows

### Vendor-Scoped

- create own
- update own
- manage own metafields
- update own price and stock

### Customer

- read published or purchasable variants only through storefront

---

## Product Metafields

### Admin

- view all
- override where policy allows

### Vendor-Scoped

- manage own product metafields

### Customer

- read only what is publicly exposed

---

## Variant Metafields

### Admin

- view all
- override where policy allows

### Vendor-Scoped

- manage own variant metafields

### Customer

- read only what is publicly exposed

---

## Reviews

### Admin

- full moderation and governance access

### Vendor-Scoped

- read reviews for own products if allowed
- no ownership of moderation flow by default

### Customer

- create own reviews
- update own reviews if policy allows
- delete own reviews if policy allows
- read published reviews through storefront

---

## Collections

### Admin

- full management

### Vendor-Scoped

- not allowed by default

### Customer

- read published collections only

---

## Pages

### Admin

- full management

### Vendor-Scoped

- not allowed by default

### Customer

- read published pages only

---

## Blogs / Blog Posts

### Admin

- full management

### Vendor-Scoped

- not allowed by default

### Customer

- read published content only

---

## Vendor Landing Pages

### Admin

- view all
- override where policy allows

### Vendor-Scoped

- manage own landing page settings only

### Customer

- read published vendor landing pages only

---

## Customers

### Admin

- view and manage where policy allows

### Vendor-Scoped

- not allowed by default

### Customer

- manage own profile only

---

## Customer Metafields

### Admin

- can view and manage if needed for operations

### Vendor-Scoped

- not allowed

### Customer

- may manage only the parts exposed by storefront policy

---

## Customer Addresses

### Admin

- operational visibility if needed

### Vendor-Scoped

- not allowed

### Customer

- full control over own addresses within storefront flows

---

## Wishlist

### Admin

- visibility if needed for support or analytics depending on implementation

### Vendor-Scoped

- not allowed

### Customer

- full control over own wishlist

---

## Cart

### Admin

- support visibility if implemented

### Vendor-Scoped

- not allowed

### Customer

- full control over own cart

---

## Orders

### Admin

- full read access
- broader workflow control depending on role

### Vendor-Scoped

- no full-order control by default
- only vendor-specific operational scope via order items

### Customer

- own orders only

---

## Order Items

### Admin

- full read access
- override capability where policy allows

### Vendor-Scoped

- read own
- update status of own items where policy allows

### Customer

- visible only through own order view

---

## Media

### Admin

- manage global media
- manage vendor media visibility if policy allows

### Vendor-Scoped

- manage own vendor-linked media if allowed

### Customer

- no ownership by default

---

## Themes

### Admin

- full management

### Vendor-Scoped

- not allowed by default

### Customer

- not allowed

---

## Example Permission Keys

Suggested permission key patterns:

- `user:create`
- `user:read:any`
- `user:update:any`

- `vendor:create`
- `vendor:read:any`
- `vendor:update:any`

- `product:create:own`
- `product:read:own`
- `product:update:own`
- `product:read:any`
- `product:update:any`

- `product-option:create:own`
- `product-option:update:own`

- `variant:create:own`
- `variant:update:own`
- `variant:price:update:own`
- `variant:inventory:update:own`

- `collection:create:any`
- `collection:update:any`

- `page:create:any`
- `page:update:any`

- `blog:create:any`
- `blog:update:any`
- `blog-post:create:any`
- `blog-post:update:any`

- `review:read:any`
- `review:moderate:any`
- `review:create:self`
- `review:update:self`
- `review:delete:self`

- `vendor-page:update:own`

- `order:read:any`
- `order-item:read:own`
- `order-item:update-status:own`

- `customer:read:any`
- `customer:update:self`
- `customer-address:update:self`
- `wishlist:update:self`
- `cart:update:self`

You may derive these from roles or store them explicitly depending on implementation style.

---

## Policy Check Examples

## Product Update Policy

A vendor-scoped actor may update a product only if:

1. actor has vendor-scoped product update permission
2. product belongs to actor vendor scope
3. product is vendor-manageable
4. actor is active
5. vendor is active if applicable

---

## Product Option Update Policy

A vendor-scoped actor may update a product option only if:

1. actor has product option permission
2. the parent product belongs to actor vendor scope
3. the product is vendor-manageable
4. actor is active

---

## Variant Price Update Policy

A vendor-scoped actor may update a variant price only if:

1. actor has price update permission
2. variant belongs to a product owned by actor vendor scope
3. variant is not locked by higher policy
4. actor is active

---

## Order Item Status Update Policy

A vendor-scoped actor may update order item status only if:

1. actor has order item status permission
2. order item belongs to actor vendor scope
3. requested status transition is allowed
4. action is logged in status history

---

## Review Update Policy

A customer may update a review only if:

1. actor is the review owner
2. update window or review policy allows modification
3. review is not locked by moderation state if such a rule exists

---

## Denial Rules

Requests must be denied when:

- vendor-scoped actor tries to manage users
- vendor-scoped actor tries to edit admin-owned global content
- vendor-scoped actor tries to modify another vendor’s catalog
- vendor-scoped actor tries to moderate reviews without permission
- customer tries to access another customer’s order
- customer tries to update another customer’s review
- route-level UI hides action but backend does not validate ownership

---

## Final Permission Principle

> Admin governs the platform. Vendor-scoped actors govern only their own catalog and order-item scope. Customers govern only their own account-facing resources.
