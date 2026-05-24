# AI Skills and Repository Rules

This document explains how AI coding assistants should work inside this repository.

The goal is not only to generate code, but to preserve architecture, ownership boundaries, and long-term maintainability.

---

## Project Identity

This repository is a **single-store, multi-vendor headless ecommerce marketplace**.

It is **not** a multi-store SaaS platform.

Important facts:

- there is only one store
- there are many vendors inside the store
- one vendor is the default internal vendor owned by the platform
- users are managed by admin
- products are globally visible in the storefront
- vendors own only their own catalog and vendor-scoped operational responsibilities
- admin owns global storefront structure and editorial content
- translations are not included for now
- customer routes use `/customer/...`
- product reviews are supported
- product options such as shape, color, and size are supported
- customer core fields plus customer metafields are supported

---

## Core Rules

### Rule 1: Preserve Single-Store Design

Do not introduce many-store abstractions unless explicitly requested.

Avoid:

- tenant-per-store architecture
- store switching UI
- store-isolated admin spaces
- fake multi-store SaaS abstractions

Allowed:

- keeping `store_id` in key tables where useful for clarity and future safety

---

### Rule 2: Preserve Ownership Boundaries

Always follow these rules.

#### Admin-owned entities

- users
- vendors
- collections
- pages
- blogs
- blog posts
- themes
- global SEO defaults
- store navigation
- global merchandising
- platform governance
- review moderation if enabled

#### Vendor-owned entities

- products
- product details
- product options
- product metafields
- variants
- variant details
- variant metafields
- vendor landing page settings
- vendor-specific order item operations

#### Customer-owned or customer-scoped entities

- customer account profile
- customer addresses
- cart
- wishlist
- product reviews created by the customer
- order history visibility

If generating code, do not let vendors modify admin-owned entities unless explicitly requested.

---

### Rule 3: Vendors Do Not Manage Users

Users are handled by admin.

Do not generate:

- vendor user CRUD
- vendor user admin UI
- vendor role assignment flows
- vendor-managed authentication lifecycle

If vendor-scoped actors exist in auth, treat them as admin-governed actors with vendor-limited permissions.

---

### Rule 4: Products Are Global, Ownership Is Vendor-Based

Canonical product route:

- `/products/:handle`

Do not move products into vendor-prefixed URLs by default.

Vendor identity is represented by:

- `vendor_id` in the database
- vendor information on the product page
- vendor landing pages such as `/:vendorSlug`

---

### Rule 5: Customer Routes Use `/customer/...`

Canonical customer route patterns should follow:

- `/customer/login`
- `/customer/register`
- `/customer/reset-password`
- `/customer/account`
- `/customer/orders`
- `/customer/orders/:orderNumber`

Do not switch these to `/customers/...` unless the repository is explicitly redesigned.

---

### Rule 6: Vendor Order Access Must Be Item-Scoped

Customers place a full store order.

Vendors do not control the full order.

Vendors should operate only on:

- their own order items
- their own order item statuses
- their own fulfillment-relevant operations

Admin can view the full order.

Customers can view the full order.

---

### Rule 7: Vendor Landing Pages Are Controlled Customization, Not Full Themes

Vendor landing pages such as:

- `/nike`
- `/adidas`

may support:

- banner
- bio
- featured products
- SEO settings
- limited visual configuration

Do not generate architecture that lets vendors override the global storefront theme unless explicitly requested.

---

### Rule 8: Metafields Are the Extension Layer

Use metafields for flexible business attributes.

Do not add physical columns for every optional field unless that field is core to the domain.

Metafields must have:

- namespace
- key
- value
- type

Supported major metafield domains in this repository include:

- product metafields
- variant metafields
- customer metafields

---

### Rule 9: Product Options Must Support Shopify-Like Behavior

Products can have structured option axes such as:

- Shape
- Color
- Size

AI-generated code should preserve the distinction between:

- products
- product options
- product option values
- variants
- selected option values on variants

Do not collapse this into a flat, hardcoded variant model unless explicitly requested.

---

### Rule 10: Reviews Are First-Class Commerce Data

Product reviews are part of the domain.

AI-generated code should support:

- customer-authored reviews
- product-level review linkage
- review status handling such as pending or published
- optional admin moderation
- storefront review reads

Do not model reviews as loose comments without clear ownership and status handling.

---

### Rule 11: Business Logic Belongs in Services

When generating backend code:

- route handlers should stay thin
- services should contain business rules
- repositories should contain DB access
- permission checks should be explicit and testable

Avoid writing all logic directly in route files.

---

### Rule 12: Preserve Module Isolation

Backend modules should stay domain-based.

Preferred layout:

```text
module/
├── routes.ts
├── controller.ts
├── service.ts
├── repository.ts
├── schema.ts
├── types.ts
├── permissions.ts
└── utils.ts
```

Do not create giant shared files mixing unrelated domains.

---

### Rule 13: Shared Types Must Stay in Shared Packages

If a type is used across multiple apps, place it in shared packages such as:

- `packages/types`
- `packages/auth`
- `packages/config`
- `packages/utils`

Do not duplicate DTOs across API, admin, and storefront without a strong reason.

---

## Coding Guidelines for AI

### Backend

When generating backend code:

- use Fastify patterns
- validate inputs with Zod
- use strict TypeScript
- prefer explicit DTOs
- keep auth actor-aware
- enforce vendor ownership checks on writes
- use explicit review status handling
- support product option modeling properly

### Database

When generating Drizzle schemas:

- use snake_case DB column names
- use camelCase TypeScript fields
- use explicit foreign keys
- use explicit indexes
- model ownership with `vendor_id`
- keep schema normalized
- keep customer extensibility in customer metafields where appropriate

### Frontend

When generating admin or storefront code:

- admin must separate admin areas from vendor-scoped areas
- storefront must preserve one global customer experience
- vendor landing pages should be data-driven
- no vendor user management UI should exist unless explicitly requested later
- do not rely only on frontend permission checks; backend must enforce them too
- customer account routes should align with `/customer/...`

---

## What AI Should Ask Before Making Major Changes

Before changing architecture, ask internally:

1. Is this admin-owned, vendor-owned, or customer-scoped?
2. Is this globally routed or vendor-routed?
3. Will this break the single-store marketplace model?
4. Should this be a metafield instead of a physical column?
5. Does this belong in customer core fields or customer metafields?
6. Is this logic better placed in service or repository instead of route handler?
7. Does the vendor truly have permission to do this?
8. Does this accidentally give vendors user management authority?
9. Does this break the product option or variant structure?
10. Does this break customer review ownership or moderation flow?

---

## Common Correct Patterns

### Correct

- vendor updates price of own variant
- vendor updates stock of own variant
- vendor edits own product details
- vendor edits own product metafields
- vendor defines options like color and size for own product
- vendor updates own vendor landing page banner
- admin creates collection
- admin edits page
- admin manages users
- admin moderates reviews if moderation exists
- customer submits review for purchased or allowed product
- vendor sees only own order items

### Incorrect

- vendor creates or manages users
- vendor edits another vendor’s product
- vendor edits global collection
- vendor edits global page
- vendor edits global blog
- vendor sees full multi-vendor order internals without restriction
- vendor overrides global theme rendering
- AI introduces many-store complexity without requirement
- AI flattens product options and variants into an inflexible schema
- AI treats customer profile extensions as random top-level columns without reason

---

## Preferred Implementation Priorities

If building from scratch, prioritize in this order:

1. vendors
2. products
3. product options
4. variants
5. collections
6. pages
7. blogs
8. metafields
9. vendor page settings
10. customers
11. customer metafields
12. carts
13. wishlists
14. reviews
15. orders
16. order item permissions
17. caching and jobs

---

## Documentation Expectations for AI

When AI generates code, it should also:

- explain where the code belongs
- preserve architectural boundaries
- mention permission assumptions
- avoid silent architectural drift
- avoid unnecessary abstractions

---

## Final Repository Principle

When in doubt, preserve this rule:

> one storefront, many vendors, admin-managed users, strict ownership boundaries.
