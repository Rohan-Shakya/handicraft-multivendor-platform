# Single-Store Multi-Vendor Headless Ecommerce Platform

## Overview

This repository is a production-oriented starter architecture for building a modern **single-store, multi-vendor headless ecommerce marketplace**.

The platform is designed around **one public storefront** with **multiple vendors** operating inside the same commerce system.

Example shape:

- store domain: `daraz.com`
- vendors inside the store:
  - `daraz` (default internal vendor)
  - `nike`
  - `adidas`

Customers experience a single unified storefront, while vendors manage only their own catalog and vendor-scoped operational responsibilities through controlled vendor-facing workflows inside the admin system.

This repository is intended to be understandable by:

- backend engineers
- frontend engineers
- architects
- product teams
- AI coding assistants such as GPT, Claude, and Gemini

The architecture is designed for long-term extensibility, strict ownership boundaries, scalable storefront delivery, and clean modular development.

---

## Core Model

This is a **single-store marketplace**, not a multi-store SaaS platform.

Logical model:

```text
Store (only one)
├── Admin / Platform Operations
├── Vendors
│   ├── daraz (default internal vendor)
│   ├── nike
│   └── adidas
├── Products
│   ├── Product Options
│   ├── Variants
│   └── Reviews
├── Collections
├── Pages
├── Blogs
├── Customers
├── Orders
├── Themes / Storefront
└── Metafields / Media
```

### Important Interpretation

- there is **one store only**
- all products belong to that one store
- every product must belong to exactly one vendor
- one vendor is the **default internal vendor** owned by the store itself
- admin controls global content, users, merchandising, and governance
- vendors do **not** manage users
- vendors only manage their own catalog and vendor-specific operational scope
- translations are **not included for now**

---

## Example Business Shape

### Store

- `daraz.com`

### Vendors

- `daraz`
- `nike`
- `adidas`

### Example URLs

#### Global Storefront URLs

- `daraz.com/products/running-shoe-x`
- `daraz.com/collections/shoes`
- `daraz.com/collections/clothes`
- `daraz.com/collections/sale`
- `daraz.com/collections/new-arrivals`
- `daraz.com/blogs/how-to-clean-running-shoes`
- `daraz.com/pages/about-us`

#### Vendor Landing URLs

- `daraz.com/daraz`
- `daraz.com/nike`
- `daraz.com/adidas`

#### Customer URLs

- `daraz.com/customer/login`
- `daraz.com/customer/register`
- `daraz.com/customer/reset-password`
- `daraz.com/cart`
- `daraz.com/wishlist`
- `daraz.com/customer/orders`
- `daraz.com/customer/orders/123456789`
- `daraz.com/customer/account`

---

## Core Vision

This platform is built around six major goals:

1. **Single-store marketplace architecture**
   - one domain, one storefront, many vendors

2. **Strict ownership boundaries**
   - admin controls global entities and governance
   - vendors control only their own catalog and vendor operational scope

3. **Headless-first architecture**
   - backend and storefront are decoupled

4. **High extensibility**
   - metafields, media, reviews, and theme-driven rendering

5. **Scalable read model**
   - optimized for high storefront traffic and large catalogs

6. **Maintainable development model**
   - modular domains, typed packages, and AI-safe architectural rules

---

## Main Features

### Marketplace Features

- single-store multi-vendor catalog
- default internal vendor for store-owned products
- vendor-specific product ownership
- vendor-specific variant ownership through product ownership
- vendor landing pages
- vendor-specific order handling
- admin-level governance across all vendors
- global customer account flows
- global storefront experience

### Vendor Features

Vendors can manage only:

- products
- product details
- product metafields
- product options
- variants
- variant details
- variant metafields
- price changes
- stock changes
- vendor landing page settings
- vendor-specific order handling

Vendors do **not** handle users.

User management is handled by admin.

### Admin Features

Admin manages:

- users
- vendors
- vendor approval and governance
- collections
- pages
- blogs
- blog posts
- storefront structure
- theme management
- global SEO configuration
- visibility across all products and orders
- customer support and backoffice operations
- review moderation if desired

### Customer Features

- registration
- login
- password reset
- cart
- wishlist
- account management
- order history
- order detail pages
- product reviews

---

## Architecture Summary

This platform is split into three primary applications:

### 1. API

Handles:

- admin APIs
- vendor APIs
- storefront APIs
- customer auth APIs
- permissions
- validation
- jobs and indexing coordination
- cache orchestration

### 2. Admin Dashboard

Handles:

- admin control panel
- vendor-facing workflows
- global content management
- product and catalog governance
- order operations
- vendor page settings UI
- customer administration
- user administration
- review moderation

### 3. Storefront

Handles:

- customer-facing public website
- global product pages
- collection pages
- page and blog rendering
- vendor landing pages
- cart and customer account experience
- review display and submission

---

## Correct Ownership Model

This is the most important rule in the system.

### Admin Owns

Admin controls store-wide resources such as:

- users
- vendors
- collections
- pages
- blogs
- blog posts
- theme system
- global SEO defaults
- store navigation
- merchandising logic
- customer administration
- order oversight
- full cross-vendor visibility
- review governance if moderation is enabled

### Vendors Own

Each vendor controls only its own:

- products
- product details
- product metafields
- product options
- variants
- variant details
- variant metafields
- prices
- stock
- vendor landing page settings
- vendor-specific order handling

### Customers Interact With

Customers only see one unified storefront:

- one main domain
- one shared catalog browsing experience
- one global cart
- one global account area
- one global editorial system
- vendor identity exposed through product data and vendor landing pages

---

## Platform Model

```text
Store
├── Admin
│   ├── Users
│   ├── Vendors
│   ├── Collections
│   ├── Pages
│   ├── Blogs
│   ├── Blog Posts
│   ├── Global Theme
│   ├── SEO / Navigation / Merchandising
│   ├── Customer Administration
│   └── Cross-Vendor Order Oversight
│
├── Vendors
│   ├── Vendor Profile
│   ├── Vendor Landing Page Settings
│   ├── Products
│   │   ├── Product Details
│   │   ├── Product Metafields
│   │   ├── Product Options
│   │   ├── Variants
│   │   │   ├── Variant Details
│   │   │   └── Variant Metafields
│   │   ├── Product Media
│   │   └── Reviews (read visibility, optional moderation visibility)
│   └── Vendor-Specific Order Handling
│
├── Customers
│   ├── Login / Register / Reset Password
│   ├── Account
│   ├── Orders
│   ├── Wishlist
│   ├── Cart
│   └── Reviews
│
├── Global Storefront
│   ├── Products
│   ├── Collections
│   ├── Pages
│   ├── Blogs
│   └── Vendor Landing Pages
│
└── Themes / Media / Metafields
```

---

## URL Strategy

### Global Content Routes

- `/products/:handle`
- `/collections/:handle`
- `/blogs/:handle`
- `/pages/:handle`

### Vendor Routes

Vendor landing pages are top-level vendor routes:

- `/:vendorSlug`

Examples:

- `/daraz`
- `/nike`
- `/adidas`

Optional future routes may include:

- `/:vendorSlug/products`
- `/:vendorSlug/about`

But the canonical vendor landing route is:

- `/:vendorSlug`

### Customer Routes

- `/customer/login`
- `/customer/register`
- `/customer/reset-password`
- `/customer/account`
- `/customer/orders`
- `/customer/orders/:orderNumber`
- `/cart`
- `/wishlist`

### Why This Matters

Products remain globally accessible:

- `/products/:handle`

Collections, pages, and blogs remain global editorial or storefront routes.

Vendor identity is exposed through:

- vendor ownership in data
- vendor name or brand on the product page
- vendor landing page route
- storefront filters and merchandising

This preserves one unified storefront while allowing vendor presence.

---

## Tech Stack

## Backend

- **Node.js**
- **Fastify**
- **TypeScript**
- **PostgreSQL**
- **Drizzle ORM**
- **Redis**
- **Zod**
- **JWT authentication**

## Frontend

### Admin Dashboard

- **React**
- **Vite**
- **TypeScript**
- **Tailwind CSS**
- **TanStack Query**
- **Zustand** or **Redux**

### Storefront

- **Next.js**
- **App Router**
- **React Server Components**
- **ISR / caching / edge where appropriate**

---

## Monorepo Structure

```text
.
├── apps
│   ├── api
│   ├── admin
│   └── storefront
│
├── packages
│   ├── auth
│   ├── config
│   ├── db
│   ├── types
│   ├── ui
│   └── utils
│
├── docs
│   ├── architecture
│   ├── api
│   ├── domain
│   └── ai
│
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
└── README.md
```

---

## Recommended Detailed Monorepo Structure

```text
.
├── apps
│   ├── api
│   │   ├── src
│   │   │   ├── app.ts
│   │   │   ├── server.ts
│   │   │   ├── plugins
│   │   │   ├── modules
│   │   │   │   ├── auth
│   │   │   │   ├── store
│   │   │   │   ├── users
│   │   │   │   ├── vendors
│   │   │   │   ├── vendor-pages
│   │   │   │   ├── products
│   │   │   │   ├── product-options
│   │   │   │   ├── product-metafields
│   │   │   │   ├── variants
│   │   │   │   ├── variant-metafields
│   │   │   │   ├── product-images
│   │   │   │   ├── reviews
│   │   │   │   ├── collections
│   │   │   │   ├── pages
│   │   │   │   ├── blogs
│   │   │   │   ├── blog-posts
│   │   │   │   ├── customers
│   │   │   │   ├── customer-addresses
│   │   │   │   ├── customer-metafields
│   │   │   │   ├── wishlists
│   │   │   │   ├── carts
│   │   │   │   ├── orders
│   │   │   │   ├── order-items
│   │   │   │   ├── media
│   │   │   │   ├── themes
│   │   │   │   ├── search
│   │   │   │   ├── jobs
│   │   │   │   └── health
│   │   │   ├── lib
│   │   │   └── types
│   │   └── package.json
│   │
│   ├── admin
│   │   ├── src
│   │   │   ├── app
│   │   │   ├── components
│   │   │   ├── features
│   │   │   │   ├── users
│   │   │   │   ├── vendors
│   │   │   │   ├── vendor-pages
│   │   │   │   ├── products
│   │   │   │   ├── product-options
│   │   │   │   ├── variants
│   │   │   │   ├── collections
│   │   │   │   ├── pages
│   │   │   │   ├── blogs
│   │   │   │   ├── reviews
│   │   │   │   ├── customers
│   │   │   │   ├── wishlists
│   │   │   │   ├── carts
│   │   │   │   ├── orders
│   │   │   │   └── themes
│   │   │   ├── hooks
│   │   │   ├── lib
│   │   │   ├── store
│   │   │   └── routes
│   │   └── package.json
│   │
│   └── storefront
│       ├── app
│       ├── components
│       ├── features
│       ├── lib
│       ├── themes
│       └── package.json
│
├── packages
│   ├── auth
│   ├── config
│   ├── db
│   ├── types
│   ├── ui
│   └── utils
│
├── docs
│   ├── architecture
│   ├── api
│   ├── domain
│   └── ai
│
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
└── README.md
```

---

## Application Boundaries

### `apps/api`

Responsible for:

- auth flows
- admin APIs
- vendor APIs
- storefront APIs
- customer account APIs
- validation
- permission checks
- job dispatching
- search indexing coordination
- cache invalidation coordination

### `apps/admin`

Responsible for:

- admin dashboard
- vendor-facing catalog workflows
- user management
- vendor management
- global content management
- order operations
- vendor page settings UI
- customer administration
- review moderation

### `apps/storefront`

Responsible for:

- customer-facing storefront
- product pages
- collection pages
- page and blog rendering
- vendor landing pages
- cart and wishlist views
- customer account views
- review display and submission

### `packages/db`

Responsible for:

- Drizzle schemas
- migrations
- DB connection setup
- query helpers
- relation definitions

### `packages/auth`

Responsible for:

- JWT signing and verification
- password hashing
- actor resolution
- auth guards
- role checks
- policy helpers

### `packages/types`

Responsible for:

- shared DTOs
- shared API contracts
- domain enums
- actor types
- shared interfaces

### `packages/config`

Responsible for:

- environment validation
- runtime config
- feature flags
- store-level constants

### `packages/utils`

Responsible for:

- helper functions
- slug handling
- formatters
- validation utilities

### `packages/ui`

Responsible for:

- shared design system
- reusable admin components
- tokens and primitives

---

## Domain Boundaries

Each backend module should remain self-contained.

Recommended module shape:

```text
module-name/
├── routes.ts
├── controller.ts
├── service.ts
├── repository.ts
├── schema.ts
├── types.ts
├── permissions.ts
└── utils.ts
```

Business logic should live in services, not in route handlers.

---

## Correct Database Philosophy

Because this is a single-store marketplace:

- the system should assume exactly one store in application logic
- top-level entities may still retain `store_id` for clarity and future safety
- every product belongs to exactly one vendor
- every vendor belongs to the single store
- admin editorial entities remain global to the store
- vendor-specific responsibilities are modeled through `vendor_id`
- user management remains centralized under admin governance
- translations are not modeled for now

Recommended practical approach:

- keep `store_id` on top-level store entities
- keep `vendor_id` on vendor-owned catalog and operational entities
- do not model vendors as independent stores
- do not introduce fake multi-store abstraction unless explicitly requested

---

## Core Database Schema

## Stores

There is only one store, but keeping a `stores` table is useful for configuration.

**Fields**

- `id`
- `name`
- `slug`
- `domain`
- `default_currency`
- `timezone`
- `created_at`
- `updated_at`

### Example row

- `daraz`

---

## Users

Users are handled by admin, not vendors.

This table represents admin-side system users responsible for operating the platform.

**Fields**

- `id`
- `email`
- `password_hash`
- `role`
- `status`
- `created_at`
- `updated_at`

### Example roles

- `super_admin`
- `store_admin`
- `catalog_manager`
- `content_manager`
- `support_agent`

---

## Vendors

Represents sellers inside the single store.

**Fields**

- `id`
- `store_id`
- `name`
- `slug`
- `description`
- `email`
- `logo_url`
- `cover_image_url`
- `status`
- `is_default`
- `created_at`
- `updated_at`

### Notes

- `daraz` itself should exist as a vendor
- `is_default = true` for the internal store-owned vendor
- all products must belong to a vendor

---

## Vendor Page Settings

Allows vendors to customize their own public vendor landing page.

**Fields**

- `id`
- `vendor_id`
- `banner_image_url`
- `headline`
- `subheadline`
- `description_html`
- `featured_product_ids`
- `seo_title`
- `seo_description`
- `theme_settings_json`
- `created_at`
- `updated_at`

### Purpose

Used for routes like:

- `/nike`
- `/adidas`

This is vendor-scoped storefront customization, not full theme control.

---

## Products

Products are globally visible in the storefront, but operationally owned by vendors.

**Fields**

- `id`
- `store_id`
- `vendor_id`
- `handle`
- `title`
- `description_html`
- `product_type`
- `status`
- `template_suffix`
- `seo_title`
- `seo_description`
- `featured_image_url`
- `featured_image_alt_text`
- `featured_image_width`
- `featured_image_height`
- `published_at`
- `created_at`
- `updated_at`

### Important Rules

- canonical product URL is global:
  - `/products/:handle`
- product ownership is vendor-bound through `vendor_id`
- vendors may edit only their own products

---

## Product Options

Product options define the variant axes in a Shopify-like way.

Examples:

- Shape
- Color
- Size

A product may have zero, one, two, or three options depending on the business rule you choose.

### Fields

- `id`
- `product_id`
- `name`
- `position`
- `created_at`
- `updated_at`

---

## Product Option Values

Represents the allowed values for a product option.

Examples:

- option: `Color`
  - values: `Red`, `Blue`, `Black`

- option: `Size`
  - values: `S`, `M`, `L`

### Fields

- `id`
- `product_option_id`
- `value`
- `position`
- `created_at`
- `updated_at`

---

## Product Metafields

Vendor-owned product custom data.

**Fields**

- `id`
- `product_id`
- `namespace`
- `key`
- `value`
- `type`
- `created_at`
- `updated_at`

---

## Variants

Purchasable variants belonging to products.

**Fields**

- `id`
- `product_id`
- `title`
- `sku`
- `barcode`
- `price`
- `compare_at_price`
- `inventory_quantity`
- `weight`
- `weight_unit`
- `selected_options`
- `image_url`
- `position`
- `status`
- `created_at`
- `updated_at`

### Important Rules

- vendors can update price
- vendors can update inventory
- vendors can manage variant details for their own products only

### Practical Optional Fields for Variants

These are common additions you may include later if needed:

- `cost_price`
- `wholesale_price`
- `track_inventory`
- `allow_backorder`
- `country_of_origin`
- `hs_code`

Only add them if they are genuinely needed in the first version.

### Variant Option Representation

`selected_options` may be stored as structured JSON such as:

```json
[
  { "name": "Color", "value": "Black" },
  { "name": "Size", "value": "42" }
]
```

This keeps the variant tied to the product’s option model.

---

## Variant Metafields

**Fields**

- `id`
- `variant_id`
- `namespace`
- `key`
- `value`
- `type`
- `created_at`
- `updated_at`

---

## Product Images

**Fields**

- `id`
- `product_id`
- `url`
- `alt_text`
- `width`
- `height`
- `position`
- `created_at`
- `updated_at`

---

## Product Reviews

Customers can leave reviews on products.

Whether reviews are auto-published or admin-moderated is a platform policy decision.

### Fields

- `id`
- `product_id`
- `customer_id`
- `rating`
- `title`
- `body`
- `status`
- `created_at`
- `updated_at`

### Notes

- `rating` is commonly stored as 1 to 5
- `status` may be values such as:
  - `pending`
  - `published`
  - `rejected`

### Review Ownership

- customers create reviews for products
- admin may moderate reviews
- vendors may view reviews related to their own products if desired
- vendors should not moderate global review policy unless explicitly allowed

---

## Collections

Collections are admin-owned global storefront structures.

**Fields**

- `id`
- `store_id`
- `handle`
- `title`
- `description_html`
- `collection_type`
- `sort_order`
- `template_suffix`
- `image_url`
- `image_alt_text`
- `seo_title`
- `seo_description`
- `position`
- `active`
- `published_at`
- `created_at`
- `updated_at`

### Important Rule

Vendors do not own global collections by default.

Admin owns routes like:

- `/collections/shoes`
- `/collections/clothes`
- `/collections/sale`
- `/collections/new-arrivals`

Collections may contain products from many vendors.

---

## Product Collections

Join table for many-to-many product membership.

**Fields**

- `product_id`
- `collection_id`
- `position`

---

## Pages

Admin-owned CMS pages.

**Fields**

- `id`
- `store_id`
- `handle`
- `title`
- `body_html`
- `template_suffix`
- `seo_title`
- `seo_description`
- `published_at`
- `created_at`
- `updated_at`

---

## Blogs

Admin-owned blog containers.

**Fields**

- `id`
- `store_id`
- `handle`
- `title`
- `created_at`
- `updated_at`

### Optional Future Extension

If needed later, you may add blog categories or nested blog route structures such as:

- `/blogs/news/:postHandle`
- `/blogs/guides/:postHandle`

For the first version, a flatter model is simpler.

---

## Blog Posts

Admin-owned editorial content.

**Fields**

- `id`
- `blog_id`
- `handle`
- `title`
- `body_html`
- `excerpt`
- `featured_image_url`
- `featured_image_alt_text`
- `seo_title`
- `seo_description`
- `published_at`
- `created_at`
- `updated_at`

---

## Customers

Customers represent storefront buyers.

**Fields**

- `id`
- `store_id`
- `email`
- `password_hash`
- `first_name`
- `last_name`
- `phone`
- `salutation`
- `birthdate`
- `image_url`
- `country`
- `town`
- `postal_code`
- `notes`
- `tags`
- `email_marketing_opt_in`
- `sms_marketing_opt_in`
- `vat_number`
- `tax_id`
- `created_at`
- `updated_at`

### Notes

This table stores the core customer identity and commonly queried customer fields.

If you expect many optional or custom fields, keep the base table focused and use metafields for extension.

---

## Customer Metafields

Customer-specific flexible fields that do not belong in the core customer table.

Examples:

- loyalty tier
- custom segmentation labels
- preferred language later if needed
- internal risk notes
- B2B metadata
- onboarding source
- external CRM identifiers

### Fields

- `id`
- `customer_id`
- `namespace`
- `key`
- `value`
- `type`
- `created_at`
- `updated_at`

---

## Customer Addresses

**Fields**

- `id`
- `customer_id`
- `first_name`
- `last_name`
- `company`
- `phone`
- `address_line_1`
- `address_line_2`
- `city`
- `province`
- `country`
- `postal_code`
- `is_default_billing`
- `is_default_shipping`
- `created_at`
- `updated_at`

### Important Note

Orders usually require both shipping and billing information.

Depending on your checkout model, shipping and billing addresses may:

- both point to customer addresses
- be copied into snapshot fields on the order
- be the same or different per order

For most commerce systems, order-time address snapshots are recommended.

---

## Wishlists

**Fields**

- `id`
- `customer_id`
- `product_id`
- `created_at`

---

## Carts

Depending on implementation, carts may be persisted or session-driven.

Minimal persisted cart example:

**Fields**

- `id`
- `customer_id` nullable
- `session_id` nullable
- `currency`
- `created_at`
- `updated_at`

---

## Cart Items

**Fields**

- `id`
- `cart_id`
- `product_id`
- `variant_id`
- `vendor_id`
- `quantity`
- `created_at`
- `updated_at`

---

## Orders

Orders belong to the store, but vendors act only on their own operational portions.

**Fields**

- `id`
- `store_id`
- `customer_id`
- `order_number`
- `status`
- `currency`
- `subtotal_price`
- `total_price`
- `total_tax`
- `created_at`
- `updated_at`

### Recommended Future Additions

In production systems, orders often also include:

- billing address snapshot
- shipping address snapshot
- payment status
- fulfillment status
- discount totals
- shipping totals

These can be added when checkout becomes more advanced.

---

## Order Items

Order items are the operational split point for vendor ownership.

**Fields**

- `id`
- `order_id`
- `vendor_id`
- `product_id`
- `variant_id`
- `quantity`
- `price`
- `status`
- `created_at`
- `updated_at`

### Why `vendor_id` matters here

A single customer order may contain items from multiple vendors.

Vendor access must be scoped to:

- their own order items
- their own fulfillment statuses
- their own inventory implications
- their own operational notes if implemented

---

## Order Item Status History

Recommended for real systems.

**Fields**

- `id`
- `order_item_id`
- `status`
- `changed_by_actor_type`
- `changed_by_actor_id`
- `note`
- `created_at`

This gives traceability for vendor and admin order actions.

---

## Media

**Fields**

- `id`
- `store_id`
- `vendor_id` nullable
- `url`
- `alt_text`
- `mime_type`
- `size_bytes`
- `width`
- `height`
- `created_at`

### Interpretation

- global store media may have `vendor_id = null`
- vendor-uploaded media may be linked to a vendor

---

## Themes

Global storefront themes are admin-owned.

**Fields**

- `id`
- `store_id`
- `name`
- `version`
- `description`
- `is_active`
- `created_at`
- `updated_at`

---

## Theme Settings

**Fields**

- `id`
- `theme_id`
- `config_json`
- `created_at`
- `updated_at`

---

## Entity Relationships

```text
stores 1---n vendors
stores 1---n products
stores 1---n collections
stores 1---n pages
stores 1---n blogs
stores 1---n customers
stores 1---n orders
stores 1---n themes

vendors 1---1 vendor_page_settings
vendors 1---n products
vendors 1---n order_items
vendors 1---n media

products 1---n product_options
product_options 1---n product_option_values
products 1---n product_metafields
products 1---n product_images
products 1---n variants
products 1---n product_reviews
products n---n collections

variants 1---n variant_metafields

customers 1---n customer_metafields
customers 1---n customer_addresses
customers 1---n product_reviews
customers 1---n wishlists
customers 1---n orders
customers 1---n carts

carts 1---n cart_items
orders 1---n order_items
order_items n---1 vendors
```

---

## Correct Permission Model

Permissions must follow ownership.

## Actor Types

### Admin Actors

- `super_admin`
- `store_admin`
- `catalog_manager`
- `content_manager`
- `support_agent`

### Vendor Actors

Vendor users are not vendor-managed. They are admin-managed system actors with vendor-scoped permissions if your implementation supports that model.

If you separate them logically in auth, they may still behave as vendor-scoped actors in permission evaluation, but **their lifecycle is managed by admin**.

### Customer Actor

- `customer`

---

## Permission Philosophy

### Admin Permissions

Admin can:

- manage users
- manage vendors
- view all vendor products
- manage collections
- manage pages
- manage blogs
- manage blog posts
- manage customers
- view all orders
- moderate reviews if enabled
- override workflows where policy allows
- manage themes and global storefront configuration

### Vendor Permissions

Vendor-scoped actors can:

- manage own products
- manage own product details
- manage own product metafields
- manage own product options
- manage own variants
- manage own variant details
- manage own variant metafields
- update own pricing
- update own inventory
- manage own vendor landing page settings
- view reviews for own products if desired
- handle statuses for own order items

Vendor-scoped actors cannot:

- manage users
- edit other vendors’ products
- edit global collections
- edit global pages
- edit global blogs
- edit global theme settings
- access unrelated order items
- access global admin governance features

---

## Order Control Model

This area needs special clarity.

### Store-Level Order

The customer places one order.

### Vendor-Level Operational Scope

Each vendor sees only the order items that belong to them.

This means:

- one order can contain multiple vendors
- vendors do not control the whole order
- vendors control only their own fulfillment-relevant item scope
- admin sees the full order
- customer sees the full order as one purchase

### Example

Order `#1001` contains:

- Nike shoes
- Adidas jacket
- Daraz-owned accessory

Operationally:

- Nike handles Nike order item
- Adidas handles Adidas order item
- Daraz internal team handles Daraz order item
- admin sees the whole order

---

## Metafield Model

Use metafields for extensibility, not schema chaos.

### Product Metafield Examples

- material
- care instructions
- origin
- warranty
- brand note
- size chart data
- composition data

### Variant Metafield Examples

- packaging unit
- warehouse code
- shipping class
- color metadata
- technical sizing note

### Customer Metafield Examples

- loyalty segment
- CRM sync identifier
- internal segmentation flags
- custom B2B metadata
- acquisition source metadata

### Rules

- always use `namespace`
- always use `key`
- always use typed values
- do not create random physical columns for optional attributes

---

## Vendor Landing Page Customization

Vendors need controlled storefront customization, but not full theme control.

### Vendors may customize:

- banner image
- logo
- description
- featured products
- hero text
- SEO title
- SEO description
- limited visual settings for their own landing page

### Vendors may not control:

- global homepage
- global theme system
- global navigation
- global collection logic
- global blog and page templates
- full storefront layout engine

### Canonical Vendor Route

- `/:vendorSlug`

Examples:

- `/nike`
- `/adidas`
- `/daraz`

### Important Routing Note

Because vendor pages use top-level slugs, vendor slugs must never conflict with reserved paths such as:

- `products`
- `collections`
- `pages`
- `blogs`
- `customer`
- `cart`
- `wishlist`
- `admin`
- `auth`
- `vendor`
- `api`

---

## API Surface

## Admin API

Used by admin operators.

Example routes:

```text
POST   /admin/users
GET    /admin/users
GET    /admin/users/:id
PATCH  /admin/users/:id

POST   /admin/vendors
GET    /admin/vendors
GET    /admin/vendors/:id
PATCH  /admin/vendors/:id

GET    /admin/products
GET    /admin/products/:id
PATCH  /admin/products/:id

POST   /admin/collections
GET    /admin/collections
PATCH  /admin/collections/:id

POST   /admin/pages
PATCH  /admin/pages/:id

POST   /admin/blogs
POST   /admin/blog-posts

GET    /admin/reviews
PATCH  /admin/reviews/:id

GET    /admin/customers
GET    /admin/orders
GET    /admin/orders/:id
```

## Vendor API

Used by vendor-scoped actors for catalog and order-item operations.

```text
GET    /vendor/me
PATCH  /vendor/me/page-settings

POST   /vendor/products
GET    /vendor/products
GET    /vendor/products/:id
PATCH  /vendor/products/:id

POST   /vendor/products/:id/options
PATCH  /vendor/products/:id/options/:optionId

POST   /vendor/products/:id/metafields
PATCH  /vendor/products/:id/metafields/:metafieldId

POST   /vendor/products/:id/variants
GET    /vendor/products/:id/variants
PATCH  /vendor/variants/:id

POST   /vendor/variants/:id/metafields
PATCH  /vendor/variants/:id/metafields/:metafieldId

PATCH  /vendor/variants/:id/price
PATCH  /vendor/variants/:id/inventory

GET    /vendor/products/:id/reviews

GET    /vendor/order-items
GET    /vendor/order-items/:id
PATCH  /vendor/order-items/:id/status
```

## Storefront API

Used by the public storefront or BFF layer.

```text
GET /storefront/products
GET /storefront/products/:handle
GET /storefront/collections
GET /storefront/collections/:handle
GET /storefront/pages/:handle
GET /storefront/blogs/:handle
GET /storefront/blog-posts/:handle
GET /storefront/vendors/:vendorSlug
GET /storefront/search
GET /storefront/products/:handle/reviews
```

## Customer API

```text
POST /auth/customer/register
POST /auth/customer/login
POST /auth/customer/reset-password

GET  /customer/me
PATCH /customer/me

GET  /customer/me/orders
GET  /customer/me/orders/:orderNumber

GET  /customer/me/wishlist
POST /customer/me/wishlist
DELETE /customer/me/wishlist/:productId

GET  /customer/me/cart
POST /customer/me/cart/items
PATCH /customer/me/cart/items/:itemId
DELETE /customer/me/cart/items/:itemId

POST /customer/products/:productId/reviews
PATCH /customer/reviews/:reviewId
DELETE /customer/reviews/:reviewId
```

---

## Search and Read Model Design

For storefront reads:

- products remain globally discoverable
- filtering may include vendor
- vendor landing pages are searchable
- search index should include vendor signals for ranking and filtering
- search can later incorporate review score or review count as ranking signals

### Example storefront queries

- all Nike products
- all products in shoes collection
- all products in sale
- all products in new arrivals
- all products in new arrivals from Adidas

---

## Fastify Plugin Architecture

Suggested structure:

```text
apps/api/src/plugins/
├── env.ts
├── db.ts
├── redis.ts
├── auth.ts
├── zod.ts
├── cors.ts
├── rate-limit.ts
├── logger.ts
└── routes.ts
```

### Plugin Responsibilities

- `env.ts` validates environment variables
- `db.ts` registers Drizzle DB
- `redis.ts` registers Redis
- `auth.ts` resolves actors and guards
- `zod.ts` provides validation helpers
- `cors.ts` handles cross-origin rules
- `rate-limit.ts` protects sensitive endpoints
- `logger.ts` centralizes request logging
- `routes.ts` mounts domain modules

---

## Redis and Background Jobs

Use Redis for:

- caching storefront responses
- rate limiting
- job coordination
- invalidation fanout
- distributed locks
- product detail cache
- collection cache
- vendor landing page cache
- review aggregation refresh jobs if needed

### Example cache keys

```text
storefront:product:{handle}
storefront:collection:{handle}
storefront:page:{handle}
storefront:blog-post:{handle}
storefront:vendor:{vendorSlug}
storefront:product-reviews:{productId}
```

### Example background jobs

- product search indexing
- image optimization
- sitemap generation
- feed generation
- cache invalidation
- email sending
- review aggregate recalculation

---

## Theme Strategy

Global theme is admin-owned.

Vendor landing pages may have limited settings, but vendor settings should never become a second global theme system.

### Best model

- theme rendering lives in storefront theme files
- vendor landing page content is data-driven
- vendor settings affect content and limited presentation only
- global storefront architecture remains centrally controlled

---

## Suggested Backend Module List

```text
auth
store
users
vendors
vendor-pages
products
product-options
product-metafields
variants
variant-metafields
product-images
reviews
collections
product-collections
pages
blogs
blog-posts
customers
customer-addresses
customer-metafields
wishlists
carts
orders
order-items
media
themes
search
jobs
health
```

---

## Suggested Admin Dashboard Areas

### Admin Areas

- dashboard
- users
- vendors
- vendor landing pages
- products
- product options
- variants
- collections
- pages
- blogs
- blog posts
- reviews
- customers
- customer profiles
- wishlists
- carts
- orders
- themes
- SEO management

### Vendor Areas

Vendor-scoped actors should see only the areas relevant to their permissions:

- own products
- own product options
- own variants
- pricing
- inventory
- metafields
- vendor landing page customization
- reviews for own products if exposed
- own order items

No vendor-facing user management area should exist if user lifecycle is admin-controlled.

---

## Development Principles

### Good Practices

- keep admin and vendor APIs clearly separated
- enforce ownership checks in services
- keep users admin-managed
- keep product ownership vendor-based
- keep collections, pages, blogs, and blog posts admin-based
- use metafields for extensibility
- keep storefront reads optimized and cacheable
- make AI-generated code preserve boundaries

### Avoid

- treating vendors as independent stores
- letting vendors manage users
- letting vendors edit global collections without explicit policy
- mixing full-order permissions with vendor item-level permissions
- storing all settings in one giant JSON column
- putting business logic directly in route handlers

---

## Future Extensions

Potential later additions:

- translations
- discount engine
- promotions
- ratings aggregates and recommendation signals
- vendor shipping configuration
- returns
- refunds
- warehouse locations
- payout calculation
- commissions
- recommendation engine
- AI merchandising tools

---

## Summary

This project is a **single-store, multi-vendor headless ecommerce marketplace template**.

It supports:

- one global storefront
- many vendors
- global admin governance
- admin-managed users
- vendor-owned products and variants
- Shopify-style product options such as shape, color, and size
- vendor-owned metafields for catalog entities
- vendor landing page customization
- product reviews
- rich customer profiles with core fields plus customer metafields
- global collections, pages, and blogs
- vendor-scoped order-item operations
- customer account, cart, and wishlist flows
- scalable headless storefront delivery

### Core principle

> one storefront, many vendors, admin-managed users, strict ownership boundaries.

That is the foundation that keeps the platform scalable, maintainable, and operationally correct.

---

## Next Recommended Steps

1. finalize actor model for admin-managed vendor-scoped access
2. implement Drizzle schema for vendors, products, product options, variants, customers, collections, pages, and orders
3. build vendor ownership policy helpers
4. implement vendor landing page settings
5. build product, variant, and customer metafield modules
6. add review module and moderation policy
7. add cart and wishlist modules
8. add Redis caching and background jobs
9. connect storefront pages to APIs

---
