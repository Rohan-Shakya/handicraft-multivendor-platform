# Ownership Matrix

## Purpose

This document defines ownership boundaries for the platform.

This project is a **single-store, multi-vendor marketplace** where ownership must remain explicit and enforceable.

---

## Ownership Principle

This platform follows a simple rule:

> Admin governs the platform. Vendors govern their catalog. Customers govern their own account-facing resources.

That means:

- admin controls global structure, governance, and backoffice operations
- vendors control only their own catalog and vendor-scoped operations
- customers control only their own account-level resources

---

## Admin-Owned

Admin owns and governs the following resources:

- users
- vendors
- collections
- pages
- blogs
- blog posts
- themes
- global storefront configuration
- navigation
- SEO defaults
- merchandising rules
- global order oversight
- customer administration
- global reporting
- platform governance
- review moderation if enabled

### Admin Capabilities

Admin can:

- create and manage users
- create and manage vendors
- view all products
- view all product options
- view all variants
- manage collections
- manage pages
- manage blogs
- manage blog posts
- manage customers
- manage customer profiles
- view full orders
- override workflows where policy allows
- configure storefront-wide settings
- moderate product reviews if enabled

---

## Vendor-Owned

Vendors own and operate the following resources:

- products
- product details
- product options
- product option values
- product metafields
- product media for own products
- variants
- variant details
- variant metafields
- price changes
- stock changes
- vendor landing page settings
- vendor-specific order item handling

### Vendor Capabilities

Vendor-scoped actors can:

- create own products
- update own products
- manage own product options
- manage own product option values
- manage own product metafields
- create own variants
- update own variants
- manage own variant metafields
- update own pricing
- update own inventory
- manage own vendor landing page content
- view reviews for own products if allowed
- update statuses for own order items

---

## Customer-Owned / Customer-Scoped

Customers control their own account-facing resources:

- own account profile
- own addresses
- own cart
- own wishlist
- own order history visibility
- own password reset flow
- own authentication session
- own product reviews

### Customer Capabilities

Customers can:

- register
- login
- reset password
- manage own account details
- manage own wishlist
- manage own cart
- view own orders
- view own order details
- create own product reviews
- edit or delete own reviews if policy allows

---

## Shared Visibility But Different Control

### Products

- vendor creates and manages own products
- admin can view all products
- admin may moderate or override based on platform policy
- customer can browse published products only

### Product Options

- vendor creates and manages own product options
- admin can view all product options
- customer sees options only through the storefront selection experience

### Variants

- vendor creates and manages own variants
- admin can view all variants
- customer sees only published or purchasable variants

### Reviews

- customer creates review for a product
- admin may moderate reviews
- vendor may read reviews related to own products if exposed by policy
- vendor does not own global review policy

### Orders

- customer sees full own order
- admin sees full order across all vendors
- vendor sees only own order items and related operational scope

### Vendor Landing Pages

- vendor manages content for own landing page
- admin can view and override if policy allows
- customers browse published vendor landing pages

---

## Explicit Non-Ownership Rules

### Vendors Do Not Own

Vendors do **not** own or manage:

- users
- collections
- pages
- blogs
- blog posts
- themes
- global navigation
- global SEO defaults
- full-order administration
- other vendors’ products
- other vendors’ variants
- other vendors’ order items
- review moderation policy
- customer administration

### Customers Do Not Own

Customers do not manage:

- products
- product options
- variants
- collections
- pages
- blogs
- vendors
- theme settings
- admin workflows
- other customers’ data
- vendor operations

---

## Ownership Decision Rules

When classifying a resource, ask:

1. Is this global storefront structure?
   - If yes, admin-owned.

2. Is this vendor catalog or vendor operational scope?
   - If yes, vendor-owned.

3. Is this customer account data or customer-authored content?
   - If yes, customer-scoped.

4. Is this a shared entity with different visibility levels?
   - If yes, define explicit read and write rules by actor.

---

## Ownership by Domain

## Store and Governance

### Admin

- store settings
- navigation
- SEO defaults
- themes
- governance rules

### Vendor

- no ownership

### Customer

- no ownership

---

## Users

### Admin

- full ownership and lifecycle control

### Vendor

- no ownership

### Customer

- only own customer account lifecycle through storefront flows

---

## Vendors

### Admin

- creates, manages, approves, suspends, and governs vendors

### Vendor

- controls own vendor-facing business resources only
- does not govern vendor entity lifecycle globally

### Customer

- public read exposure only where relevant

---

## Products

### Admin

- visibility over all products
- moderation and override if platform policy allows

### Vendor

- full ownership of own products

### Customer

- browse published products only

---

## Product Options and Option Values

### Admin

- visibility over all option structures
- may override where policy allows

### Vendor

- full ownership of own product option configuration

### Customer

- read-only interaction through storefront selectors

---

## Variants

### Admin

- visibility over all variants
- moderation and override if platform policy allows

### Vendor

- full ownership of own variants

### Customer

- browse and purchase allowed variants only

---

## Product Metafields

### Admin

- can view and override if platform policy allows

### Vendor

- full ownership of own product metafields

### Customer

- read only what is exposed publicly

---

## Variant Metafields

### Admin

- can view and override if platform policy allows

### Vendor

- full ownership of own variant metafields

### Customer

- read only what is exposed publicly

---

## Product Reviews

### Admin

- moderation and governance ownership

### Vendor

- visibility into reviews of own products if allowed
- no moderation ownership by default

### Customer

- ownership of own authored reviews, within policy limits

---

## Collections

### Admin

- full ownership

### Vendor

- no ownership by default

### Customer

- published read-only access

---

## Pages

### Admin

- full ownership

### Vendor

- no ownership by default

### Customer

- published read-only access

---

## Blogs and Blog Posts

### Admin

- full ownership

### Vendor

- no ownership by default

### Customer

- published read-only access

---

## Customer Profiles

### Admin

- support, backoffice visibility, and administration

### Vendor

- no ownership

### Customer

- ownership of own account-facing data only

---

## Customer Metafields

### Admin

- can view and manage if needed for operations

### Vendor

- no ownership

### Customer

- may manage only the parts exposed by storefront policy

---

## Customer Addresses

### Admin

- operational visibility if needed

### Vendor

- no ownership

### Customer

- ownership of own addresses

---

## Wishlist

### Admin

- visibility if needed for support or analytics

### Vendor

- no ownership

### Customer

- full ownership of own wishlist

---

## Cart

### Admin

- visibility if needed for support or analytics

### Vendor

- no ownership

### Customer

- full ownership of own cart

---

## Orders

### Admin

- full ownership of cross-vendor order oversight

### Vendor

- no ownership of full order object by default
- only operational scope through own order items

### Customer

- ownership of own order visibility only

---

## Order Items

### Admin

- full visibility and override if allowed

### Vendor

- ownership of own order-item operational scope

### Customer

- visible only within own orders

---

## Media

### Admin

- ownership of global media

### Vendor

- ownership of vendor-uploaded media linked to own catalog or landing page

### Customer

- no ownership by default

---

## Final Ownership Principle

> Admin governs the platform. Vendors govern their catalog and vendor-scoped order operations. Customers govern only their own account-facing resources.
