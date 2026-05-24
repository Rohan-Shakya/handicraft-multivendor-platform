CREATE TYPE "public"."api_key_status" AS ENUM('active', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."campaign_event_type" AS ENUM('impression', 'click', 'conversion');--> statement-breakpoint
CREATE TYPE "public"."campaign_status" AS ENUM('draft', 'scheduled', 'active', 'ended', 'archived');--> statement-breakpoint
CREATE TYPE "public"."cart_status" AS ENUM('active', 'completed', 'abandoned');--> statement-breakpoint
CREATE TYPE "public"."collection_rule_apply_mode" AS ENUM('all', 'any');--> statement-breakpoint
CREATE TYPE "public"."collection_rule_column" AS ENUM('title', 'product_type', 'tag', 'price', 'compare_at_price', 'sku', 'barcode', 'inventory_quantity', 'status');--> statement-breakpoint
CREATE TYPE "public"."collection_rule_relation" AS ENUM('equals', 'not_equals', 'contains', 'not_contains', 'starts_with', 'ends_with', 'greater_than', 'greater_than_or_equal', 'less_than', 'less_than_or_equal', 'is_set', 'is_not_set');--> statement-breakpoint
CREATE TYPE "public"."collection_sort_order" AS ENUM('manual', 'best_selling', 'created_desc', 'created_asc', 'updated_desc', 'updated_asc', 'title_asc', 'title_desc', 'price_asc', 'price_desc');--> statement-breakpoint
CREATE TYPE "public"."collection_status" AS ENUM('draft', 'active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."collection_type" AS ENUM('manual', 'smart');--> statement-breakpoint
CREATE TYPE "public"."commission_rule_scope" AS ENUM('default', 'vendor');--> statement-breakpoint
CREATE TYPE "public"."commission_rule_status" AS ENUM('draft', 'active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."commission_rule_type" AS ENUM('bps', 'flat_fee');--> statement-breakpoint
CREATE TYPE "public"."blog_comment_status" AS ENUM('disabled', 'moderated', 'enabled');--> statement-breakpoint
CREATE TYPE "public"."content_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."customer_segment_status" AS ENUM('active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."customer_segment_type" AS ENUM('dynamic', 'manual', 'system');--> statement-breakpoint
CREATE TYPE "public"."customer_state" AS ENUM('enabled', 'disabled', 'invited');--> statement-breakpoint
CREATE TYPE "public"."customer_tax_status" AS ENUM('collect', 'exempt', 'reverse_charge');--> statement-breakpoint
CREATE TYPE "public"."discount_code_status" AS ENUM('active', 'disabled', 'expired');--> statement-breakpoint
CREATE TYPE "public"."discount_method" AS ENUM('code', 'automatic');--> statement-breakpoint
CREATE TYPE "public"."discount_redemption_status" AS ENUM('applied_to_cart', 'applied_to_order', 'completed', 'removed', 'voided');--> statement-breakpoint
CREATE TYPE "public"."discount_scope" AS ENUM('platform', 'vendor', 'targeted_vendors');--> statement-breakpoint
CREATE TYPE "public"."discount_status" AS ENUM('draft', 'active', 'expired', 'archived');--> statement-breakpoint
CREATE TYPE "public"."discount_target_type" AS ENUM('order', 'shipping');--> statement-breakpoint
CREATE TYPE "public"."discount_type" AS ENUM('percentage', 'fixed_amount', 'free_shipping');--> statement-breakpoint
CREATE TYPE "public"."facet_filter_display_type" AS ENUM('checkbox', 'radio', 'slider', 'swatch', 'toggle');--> statement-breakpoint
CREATE TYPE "public"."facet_filter_source_type" AS ENUM('variant_price', 'variant_option', 'variant_metafield', 'product_metafield', 'collection', 'tag', 'vendor', 'rating', 'availability');--> statement-breakpoint
CREATE TYPE "public"."file_kind" AS ENUM('image', 'video', 'document', 'audio', 'other');--> statement-breakpoint
CREATE TYPE "public"."file_scope" AS ENUM('platform', 'vendor');--> statement-breakpoint
CREATE TYPE "public"."file_status" AS ENUM('active', 'archived', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."gift_card_status" AS ENUM('active', 'disabled', 'depleted');--> statement-breakpoint
CREATE TYPE "public"."inventory_reservation_status" AS ENUM('active', 'released', 'consumed', 'expired');--> statement-breakpoint
CREATE TYPE "public"."metafield_type" AS ENUM('string', 'integer', 'float', 'boolean', 'json', 'date');--> statement-breakpoint
CREATE TYPE "public"."notification_channel" AS ENUM('in_app', 'email', 'sms', 'push');--> statement-breakpoint
CREATE TYPE "public"."notification_recipient_type" AS ENUM('user', 'customer');--> statement-breakpoint
CREATE TYPE "public"."notification_status" AS ENUM('pending', 'sent', 'failed', 'read', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."fulfillment_status" AS ENUM('pending', 'fulfilled', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."order_address_type" AS ENUM('shipping', 'billing');--> statement-breakpoint
CREATE TYPE "public"."order_delivery_status" AS ENUM('not_shipped', 'in_transit', 'out_for_delivery', 'delivered', 'returned', 'failed');--> statement-breakpoint
CREATE TYPE "public"."order_fulfillment_status" AS ENUM('unfulfilled', 'partially_fulfilled', 'fulfilled', 'returned', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."order_item_status" AS ENUM('open', 'fulfilled', 'cancelled', 'returned', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."order_payment_status" AS ENUM('pending', 'authorized', 'partially_paid', 'paid', 'partially_refunded', 'refunded', 'voided', 'failed');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('draft', 'open', 'completed', 'cancelled', 'archived');--> statement-breakpoint
CREATE TYPE "public"."payment_provider" AS ENUM('stripe', 'paypal', 'esewa', 'khalti', 'fonepay', 'cod', 'manual', 'gift_card');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'authorized', 'captured', 'partially_captured', 'refunded', 'partially_refunded', 'voided', 'failed');--> statement-breakpoint
CREATE TYPE "public"."payment_transaction_status" AS ENUM('pending', 'succeeded', 'failed');--> statement-breakpoint
CREATE TYPE "public"."payment_transaction_type" AS ENUM('authorization', 'capture', 'refund', 'void', 'failure', 'adjustment');--> statement-breakpoint
CREATE TYPE "public"."vendor_payout_status" AS ENUM('pending', 'scheduled', 'paid', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."inventory_adjustment_reason" AS ENUM('manual', 'sale', 'refund', 'restock', 'correction', 'import', 'reservation', 'release');--> statement-breakpoint
CREATE TYPE "public"."inventory_policy" AS ENUM('deny', 'continue');--> statement-breakpoint
CREATE TYPE "public"."option_display_type" AS ENUM('text', 'color', 'image');--> statement-breakpoint
CREATE TYPE "public"."product_status" AS ENUM('draft', 'active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."variant_status" AS ENUM('active', 'inactive', 'archived');--> statement-breakpoint
CREATE TYPE "public"."weight_unit" AS ENUM('g', 'kg', 'lb', 'oz');--> statement-breakpoint
CREATE TYPE "public"."refund_reason" AS ENUM('customer_request', 'out_of_stock', 'damaged', 'fraud', 'shipping_failure', 'other');--> statement-breakpoint
CREATE TYPE "public"."refund_status" AS ENUM('pending', 'processed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."actor_type" AS ENUM('admin', 'vendor', 'customer');--> statement-breakpoint
CREATE TYPE "public"."return_reason" AS ENUM('damaged', 'wrong_item', 'not_as_described', 'no_longer_needed', 'size_issue', 'other');--> statement-breakpoint
CREATE TYPE "public"."return_status" AS ENUM('requested', 'approved', 'rejected', 'received', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('pending', 'published', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."shipping_rate_type" AS ENUM('flat_rate', 'weight_based', 'price_based', 'free');--> statement-breakpoint
CREATE TYPE "public"."subscription_interval" AS ENUM('day', 'week', 'month', 'year');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('active', 'paused', 'cancelled', 'past_due', 'trialing');--> statement-breakpoint
CREATE TYPE "public"."tax_behavior" AS ENUM('exclusive', 'inclusive');--> statement-breakpoint
CREATE TYPE "public"."platform_role" AS ENUM('super_admin', 'support_agent');--> statement-breakpoint
CREATE TYPE "public"."vendor_address_type" AS ENUM('business', 'billing', 'warehouse', 'return', 'origin');--> statement-breakpoint
CREATE TYPE "public"."vendor_kyc_document_type" AS ENUM('registration_certificate', 'tax_document', 'vat_document', 'owner_identity', 'bank_proof', 'address_proof', 'other');--> statement-breakpoint
CREATE TYPE "public"."vendor_kyc_status" AS ENUM('pending', 'under_review', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."vendor_member_role" AS ENUM('owner', 'admin', 'catalog_manager', 'content_manager', 'support_agent');--> statement-breakpoint
CREATE TYPE "public"."vendor_membership_status" AS ENUM('invited', 'active', 'suspended', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."vendor_status" AS ENUM('pending', 'active', 'suspended', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."webhook_delivery_status" AS ENUM('pending', 'processing', 'delivered', 'failed', 'retrying', 'dead');--> statement-breakpoint
CREATE TYPE "public"."webhook_endpoint_status" AS ENUM('active', 'disabled');--> statement-breakpoint
CREATE TYPE "public"."webhook_event_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" text PRIMARY KEY NOT NULL,
	"key_hash" text NOT NULL,
	"key_prefix" text NOT NULL,
	"name" text NOT NULL,
	"vendor_id" text,
	"created_by" text,
	"scopes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "api_key_status" DEFAULT 'active' NOT NULL,
	"last_used_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "api_keys_key_hash_unique" UNIQUE("key_hash")
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_user_id" text,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"action" text NOT NULL,
	"before_json" jsonb,
	"after_json" jsonb,
	"metadata" jsonb,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign_events" (
	"id" text PRIMARY KEY NOT NULL,
	"campaign_id" text NOT NULL,
	"type" "campaign_event_type" NOT NULL,
	"session_id" text,
	"customer_id" text,
	"order_id" text,
	"revenue" text,
	"surface" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" text PRIMARY KEY NOT NULL,
	"handle" text NOT NULL,
	"title" text NOT NULL,
	"headline" text,
	"description" text,
	"hero_image_url" text,
	"cta_text" text,
	"cta_url" text,
	"priority" integer DEFAULT 100 NOT NULL,
	"status" "campaign_status" DEFAULT 'draft' NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"accent_color" text,
	"background_color" text,
	"created_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "campaigns_date_range_chk" CHECK ("campaigns"."starts_at" <= "campaigns"."ends_at"),
	CONSTRAINT "campaigns_handle_format_chk" CHECK ("campaigns"."handle" ~ '^[a-z0-9][a-z0-9-]*$')
);
--> statement-breakpoint
CREATE TABLE "cart_item_discount_allocations" (
	"id" text PRIMARY KEY NOT NULL,
	"cart_item_id" text NOT NULL,
	"discount_code" text NOT NULL,
	"discount_title" text NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cart_item_discount_allocations_amount_nonnegative_chk" CHECK ("cart_item_discount_allocations"."amount" >= 0)
);
--> statement-breakpoint
CREATE TABLE "cart_items" (
	"id" text PRIMARY KEY NOT NULL,
	"cart_id" text NOT NULL,
	"vendor_id" text NOT NULL,
	"product_id" text NOT NULL,
	"variant_id" text NOT NULL,
	"title" text NOT NULL,
	"variant_title" text,
	"sku" text,
	"unit_price" numeric(12, 2) NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"line_subtotal" numeric(14, 2) NOT NULL,
	"line_discount_total" numeric(14, 2) DEFAULT '0' NOT NULL,
	"line_total" numeric(14, 2) NOT NULL,
	"requires_shipping" boolean DEFAULT true NOT NULL,
	"weight_grams" integer DEFAULT 0 NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cart_items_unit_price_nonnegative_chk" CHECK ("cart_items"."unit_price" >= 0),
	CONSTRAINT "cart_items_quantity_positive_chk" CHECK ("cart_items"."quantity" > 0),
	CONSTRAINT "cart_items_line_subtotal_nonnegative_chk" CHECK ("cart_items"."line_subtotal" >= 0),
	CONSTRAINT "cart_items_line_discount_nonnegative_chk" CHECK ("cart_items"."line_discount_total" >= 0),
	CONSTRAINT "cart_items_line_total_nonnegative_chk" CHECK ("cart_items"."line_total" >= 0),
	CONSTRAINT "cart_items_weight_nonnegative_chk" CHECK ("cart_items"."weight_grams" >= 0)
);
--> statement-breakpoint
CREATE TABLE "carts" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" text,
	"session_id" text,
	"token" text,
	"email" text,
	"currency_code" text DEFAULT 'USD' NOT NULL,
	"attributes" jsonb,
	"item_count" integer DEFAULT 0 NOT NULL,
	"items_subtotal_price" numeric(14, 2) DEFAULT '0' NOT NULL,
	"total_discount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"total_price" numeric(14, 2) DEFAULT '0' NOT NULL,
	"total_weight_grams" integer DEFAULT 0 NOT NULL,
	"requires_shipping" boolean DEFAULT true NOT NULL,
	"status" "cart_status" DEFAULT 'active' NOT NULL,
	"recovery_stage_sent" smallint DEFAULT 0 NOT NULL,
	"last_activity_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "carts_email_lowercase_chk" CHECK ("carts"."email" IS NULL OR "carts"."email" = lower("carts"."email")),
	CONSTRAINT "carts_item_count_nonnegative_chk" CHECK ("carts"."item_count" >= 0),
	CONSTRAINT "carts_items_subtotal_nonnegative_chk" CHECK ("carts"."items_subtotal_price" >= 0),
	CONSTRAINT "carts_total_discount_nonnegative_chk" CHECK ("carts"."total_discount" >= 0),
	CONSTRAINT "carts_total_price_nonnegative_chk" CHECK ("carts"."total_price" >= 0),
	CONSTRAINT "carts_total_weight_nonnegative_chk" CHECK ("carts"."total_weight_grams" >= 0)
);
--> statement-breakpoint
CREATE TABLE "collection_products" (
	"collection_id" text NOT NULL,
	"product_id" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "collection_products_pk" PRIMARY KEY("collection_id","product_id"),
	CONSTRAINT "collection_products_position_nonnegative_chk" CHECK ("collection_products"."position" >= 0)
);
--> statement-breakpoint
CREATE TABLE "collection_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"collection_id" text NOT NULL,
	"column" "collection_rule_column" NOT NULL,
	"relation" "collection_rule_relation" NOT NULL,
	"condition" text,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "collection_rules_position_nonnegative_chk" CHECK ("collection_rules"."position" >= 0),
	CONSTRAINT "collection_rules_condition_required_chk" CHECK (("collection_rules"."relation" IN ('is_set', 'is_not_set') AND "collection_rules"."condition" IS NULL) OR ("collection_rules"."relation" NOT IN ('is_set', 'is_not_set') AND "collection_rules"."condition" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "collections" (
	"id" text PRIMARY KEY NOT NULL,
	"vendor_id" text NOT NULL,
	"title" text NOT NULL,
	"handle" text NOT NULL,
	"type" "collection_type" DEFAULT 'manual' NOT NULL,
	"status" "collection_status" DEFAULT 'draft' NOT NULL,
	"description" text,
	"image_file_id" text,
	"image_alt" text,
	"sort_order" "collection_sort_order" DEFAULT 'manual' NOT NULL,
	"rule_apply_mode" "collection_rule_apply_mode",
	"seo_title" text,
	"seo_description" text,
	"seo_canonical_url" text,
	"published_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "collections_handle_lowercase_chk" CHECK ("collections"."handle" = lower("collections"."handle")),
	CONSTRAINT "collections_rule_apply_mode_required_for_smart_chk" CHECK (("collections"."type" = 'smart' AND "collections"."rule_apply_mode" IS NOT NULL) OR ("collections"."type" = 'manual'))
);
--> statement-breakpoint
CREATE TABLE "commission_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"scope" "commission_rule_scope" DEFAULT 'default' NOT NULL,
	"vendor_id" text,
	"status" "commission_rule_status" DEFAULT 'draft' NOT NULL,
	"type" "commission_rule_type" DEFAULT 'bps' NOT NULL,
	"value" numeric(14, 2) NOT NULL,
	"currency_code" text,
	"applies_to_shipping" boolean DEFAULT false NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	CONSTRAINT "commission_rules_scope_vendor_consistency_chk" CHECK (
        ("commission_rules"."scope" = 'default' AND "commission_rules"."vendor_id" IS NULL) OR
        ("commission_rules"."scope" = 'vendor' AND "commission_rules"."vendor_id" IS NOT NULL)
      ),
	CONSTRAINT "commission_rules_date_range_chk" CHECK ("commission_rules"."starts_at" IS NULL OR "commission_rules"."ends_at" IS NULL OR "commission_rules"."starts_at" <= "commission_rules"."ends_at"),
	CONSTRAINT "commission_rules_value_nonnegative_chk" CHECK ("commission_rules"."value" >= 0),
	CONSTRAINT "commission_rules_bps_value_range_chk" CHECK ("commission_rules"."type" != 'bps' OR ("commission_rules"."value" >= 0 AND "commission_rules"."value" <= 10000)),
	CONSTRAINT "commission_rules_flat_fee_currency_required_chk" CHECK ("commission_rules"."type" != 'flat_fee' OR "commission_rules"."currency_code" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "blog_post_tags" (
	"blog_post_id" text NOT NULL,
	"tag_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "blog_post_tags_pk" PRIMARY KEY("blog_post_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "blog_posts" (
	"id" text PRIMARY KEY NOT NULL,
	"blog_id" text NOT NULL,
	"author_id" text,
	"title" text NOT NULL,
	"handle" text NOT NULL,
	"body" text,
	"excerpt" text,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"featured_image_file_id" text,
	"image_alt" text,
	"seo_title" text,
	"seo_description" text,
	"seo_canonical_url" text,
	"published_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "blog_posts_handle_lowercase_chk" CHECK ("blog_posts"."handle" = lower("blog_posts"."handle"))
);
--> statement-breakpoint
CREATE TABLE "blog_tags" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"handle" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "blog_tags_handle_lowercase_chk" CHECK ("blog_tags"."handle" = lower("blog_tags"."handle"))
);
--> statement-breakpoint
CREATE TABLE "blogs" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"handle" text NOT NULL,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"description" text,
	"comment_status" "blog_comment_status" DEFAULT 'enabled' NOT NULL,
	"seo_title" text,
	"seo_description" text,
	"seo_canonical_url" text,
	"published_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "blogs_handle_lowercase_chk" CHECK ("blogs"."handle" = lower("blogs"."handle"))
);
--> statement-breakpoint
CREATE TABLE "pages" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"handle" text NOT NULL,
	"body" text,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"seo_title" text,
	"seo_description" text,
	"seo_keywords" text,
	"seo_canonical_url" text,
	"og_image_file_id" text,
	"published_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "pages_handle_lowercase_chk" CHECK ("pages"."handle" = lower("pages"."handle"))
);
--> statement-breakpoint
CREATE TABLE "currencies" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"symbol" text NOT NULL,
	"decimal_places" integer DEFAULT 2 NOT NULL,
	"exchange_rate" numeric(18, 8) DEFAULT '1.00000000' NOT NULL,
	"is_base" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_addresses" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"label" text,
	"first_name" text,
	"last_name" text,
	"company" text,
	"phone" text,
	"address1" text NOT NULL,
	"address2" text,
	"city" text NOT NULL,
	"province" text,
	"province_code" text,
	"country" text NOT NULL,
	"country_code" text NOT NULL,
	"zip" text NOT NULL,
	"is_default_shipping" boolean DEFAULT false NOT NULL,
	"is_default_billing" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "customer_segment_members" (
	"segment_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customer_segment_members_pk" PRIMARY KEY("segment_id","customer_id")
);
--> statement-breakpoint
CREATE TABLE "customer_segments" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"type" "customer_segment_type" DEFAULT 'dynamic' NOT NULL,
	"status" "customer_segment_status" DEFAULT 'active' NOT NULL,
	"description" text,
	"rule_json" jsonb,
	"is_system" boolean DEFAULT false NOT NULL,
	"customer_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "customer_tags" (
	"customer_id" text NOT NULL,
	"tag" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customer_tags_pk" PRIMARY KEY("customer_id","tag")
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text,
	"first_name" text,
	"last_name" text,
	"company_name" text,
	"phone" text,
	"language" text DEFAULT 'en' NOT NULL,
	"state" "customer_state" DEFAULT 'enabled' NOT NULL,
	"is_guest" boolean DEFAULT false NOT NULL,
	"email_verified_at" timestamp with time zone,
	"last_login_at" timestamp with time zone,
	"total_spent" numeric(14, 2) DEFAULT '0' NOT NULL,
	"total_orders" integer DEFAULT 0 NOT NULL,
	"last_order_at" timestamp with time zone,
	"notes" text,
	"store_credit_balance" numeric(14, 2) DEFAULT '0' NOT NULL,
	"tax_status" "customer_tax_status" DEFAULT 'collect' NOT NULL,
	"vat_number" text,
	"email_marketing_subscribed" boolean DEFAULT false NOT NULL,
	"sms_marketing_subscribed" boolean DEFAULT false NOT NULL,
	"email_marketing_updated_at" timestamp with time zone,
	"sms_marketing_updated_at" timestamp with time zone,
	"rfm_segment_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"password_reset_token" varchar(255),
	"password_reset_expires_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "customers_email_lowercase_chk" CHECK ("customers"."email" = lower("customers"."email")),
	CONSTRAINT "customers_total_spent_nonnegative_chk" CHECK ("customers"."total_spent" >= 0),
	CONSTRAINT "customers_total_orders_nonnegative_chk" CHECK ("customers"."total_orders" >= 0),
	CONSTRAINT "customers_store_credit_balance_nonnegative_chk" CHECK ("customers"."store_credit_balance" >= 0)
);
--> statement-breakpoint
CREATE TABLE "cart_applied_discounts" (
	"id" text PRIMARY KEY NOT NULL,
	"cart_id" text NOT NULL,
	"discount_id" text,
	"discount_code_id" text,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"type" "discount_type" NOT NULL,
	"target_type" "discount_target_type" NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cart_applied_discounts_amount_nonnegative_chk" CHECK ("cart_applied_discounts"."amount" >= 0)
);
--> statement-breakpoint
CREATE TABLE "discount_codes" (
	"id" text PRIMARY KEY NOT NULL,
	"discount_id" text NOT NULL,
	"code" text NOT NULL,
	"status" "discount_code_status" DEFAULT 'active' NOT NULL,
	"usage_limit" integer,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "discount_codes_code_uppercase_chk" CHECK ("discount_codes"."code" = upper("discount_codes"."code"))
);
--> statement-breakpoint
CREATE TABLE "discount_collections" (
	"id" text PRIMARY KEY NOT NULL,
	"discount_id" text NOT NULL,
	"collection_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "discount_products" (
	"id" text PRIMARY KEY NOT NULL,
	"discount_id" text NOT NULL,
	"product_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "discount_redemptions" (
	"id" text PRIMARY KEY NOT NULL,
	"discount_id" text NOT NULL,
	"discount_code_id" text,
	"cart_id" text,
	"order_id" text,
	"customer_id" text,
	"code" text NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"status" "discount_redemption_status" DEFAULT 'applied_to_cart' NOT NULL,
	"redeemed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"removed_at" timestamp with time zone,
	"voided_at" timestamp with time zone,
	CONSTRAINT "discount_redemptions_amount_nonnegative_chk" CHECK ("discount_redemptions"."amount" >= 0)
);
--> statement-breakpoint
CREATE TABLE "discount_vendor_targets" (
	"discount_id" text NOT NULL,
	"vendor_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "discount_vendor_targets_pk" PRIMARY KEY("discount_id","vendor_id")
);
--> statement-breakpoint
CREATE TABLE "discounts" (
	"id" text PRIMARY KEY NOT NULL,
	"scope" "discount_scope" DEFAULT 'platform' NOT NULL,
	"vendor_id" text,
	"title" text NOT NULL,
	"description" text,
	"status" "discount_status" DEFAULT 'draft' NOT NULL,
	"type" "discount_type" NOT NULL,
	"method" "discount_method" DEFAULT 'code' NOT NULL,
	"campaign_id" text,
	"target_type" "discount_target_type" DEFAULT 'order' NOT NULL,
	"value" numeric(14, 2) NOT NULL,
	"minimum_subtotal" numeric(14, 2),
	"usage_limit" integer,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"once_per_customer" boolean DEFAULT false NOT NULL,
	"first_order_only" boolean DEFAULT false NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"created_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "discounts_value_nonnegative_chk" CHECK ("discounts"."value" >= 0),
	CONSTRAINT "discounts_usage_limit_nonnegative_chk" CHECK ("discounts"."usage_limit" IS NULL OR "discounts"."usage_limit" >= 0),
	CONSTRAINT "discounts_usage_count_nonnegative_chk" CHECK ("discounts"."usage_count" >= 0),
	CONSTRAINT "discounts_date_range_chk" CHECK ("discounts"."starts_at" IS NULL OR "discounts"."ends_at" IS NULL OR "discounts"."starts_at" <= "discounts"."ends_at"),
	CONSTRAINT "discounts_scope_vendor_consistency_chk" CHECK (
        ("discounts"."scope" = 'platform' AND "discounts"."vendor_id" IS NULL) OR
        ("discounts"."scope" = 'vendor' AND "discounts"."vendor_id" IS NOT NULL) OR
        ("discounts"."scope" = 'targeted_vendors' AND "discounts"."vendor_id" IS NULL)
      ),
	CONSTRAINT "discounts_percentage_value_range_chk" CHECK ("discounts"."type" != 'percentage' OR ("discounts"."value" > 0 AND "discounts"."value" <= 100))
);
--> statement-breakpoint
CREATE TABLE "order_applied_discounts" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"discount_id" text,
	"discount_code_id" text,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"type" "discount_type" NOT NULL,
	"target_type" "discount_target_type" NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "order_applied_discounts_amount_nonnegative_chk" CHECK ("order_applied_discounts"."amount" >= 0)
);
--> statement-breakpoint
CREATE TABLE "vendor_order_applied_discounts" (
	"id" text PRIMARY KEY NOT NULL,
	"vendor_order_id" text NOT NULL,
	"discount_id" text,
	"discount_code_id" text,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"type" "discount_type" NOT NULL,
	"target_type" "discount_target_type" NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vendor_order_applied_discounts_amount_nonnegative_chk" CHECK ("vendor_order_applied_discounts"."amount" >= 0)
);
--> statement-breakpoint
CREATE TABLE "facet_filters" (
	"id" text PRIMARY KEY NOT NULL,
	"vendor_id" text,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"source_type" "facet_filter_source_type" NOT NULL,
	"source_ref" text,
	"display_type" "facet_filter_display_type" NOT NULL,
	"config" jsonb,
	"position" integer DEFAULT 0 NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_by" text,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "facet_filters_key_lowercase_chk" CHECK ("facet_filters"."key" = lower("facet_filters"."key")),
	CONSTRAINT "facet_filters_position_nonnegative_chk" CHECK ("facet_filters"."position" >= 0)
);
--> statement-breakpoint
CREATE TABLE "files" (
	"id" text PRIMARY KEY NOT NULL,
	"scope" "file_scope" DEFAULT 'vendor' NOT NULL,
	"vendor_id" text,
	"kind" "file_kind" DEFAULT 'image' NOT NULL,
	"status" "file_status" DEFAULT 'active' NOT NULL,
	"original_name" text NOT NULL,
	"file_name" text NOT NULL,
	"mime_type" text,
	"extension" text,
	"storage_key" text NOT NULL,
	"url" text NOT NULL,
	"alt_text" text,
	"size_bytes" integer,
	"width" integer,
	"height" integer,
	"duration_seconds" numeric(10, 2),
	"checksum" text,
	"uploaded_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "files_scope_vendor_link_chk" CHECK (("files"."scope" = 'platform' AND "files"."vendor_id" IS NULL) OR ("files"."scope" = 'vendor' AND "files"."vendor_id" IS NOT NULL)),
	CONSTRAINT "files_size_bytes_nonnegative_chk" CHECK ("files"."size_bytes" IS NULL OR "files"."size_bytes" >= 0),
	CONSTRAINT "files_width_nonnegative_chk" CHECK ("files"."width" IS NULL OR "files"."width" >= 0),
	CONSTRAINT "files_height_nonnegative_chk" CHECK ("files"."height" IS NULL OR "files"."height" >= 0),
	CONSTRAINT "files_duration_seconds_nonnegative_chk" CHECK ("files"."duration_seconds" IS NULL OR "files"."duration_seconds" >= 0)
);
--> statement-breakpoint
CREATE TABLE "gift_card_transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"gift_card_id" text NOT NULL,
	"type" text NOT NULL,
	"amount" integer NOT NULL,
	"balance_after" integer NOT NULL,
	"order_id" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "gift_card_transactions_balance_after_nonnegative_chk" CHECK ("gift_card_transactions"."balance_after" >= 0)
);
--> statement-breakpoint
CREATE TABLE "gift_cards" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"initial_balance" integer NOT NULL,
	"current_balance" integer NOT NULL,
	"currency_code" text DEFAULT 'USD' NOT NULL,
	"status" "gift_card_status" DEFAULT 'active' NOT NULL,
	"customer_id" text,
	"issued_by_user_id" text,
	"note" text,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "gift_cards_initial_balance_positive_chk" CHECK ("gift_cards"."initial_balance" > 0),
	CONSTRAINT "gift_cards_current_balance_nonnegative_chk" CHECK ("gift_cards"."current_balance" >= 0),
	CONSTRAINT "gift_cards_current_balance_lte_initial_chk" CHECK ("gift_cards"."current_balance" <= "gift_cards"."initial_balance")
);
--> statement-breakpoint
CREATE TABLE "loyalty_ledger" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"type" text NOT NULL,
	"points" integer NOT NULL,
	"order_id" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "loyalty_ledger_type_chk" CHECK ("loyalty_ledger"."type" IN ('earn', 'redeem', 'adjust', 'expire'))
);
--> statement-breakpoint
CREATE TABLE "message_threads" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"vendor_id" text NOT NULL,
	"subject" text NOT NULL,
	"product_id" text,
	"order_id" text,
	"status" text DEFAULT 'open' NOT NULL,
	"last_message_at" timestamp with time zone DEFAULT now() NOT NULL,
	"customer_unread_count" integer DEFAULT 0 NOT NULL,
	"vendor_unread_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "message_threads_status_chk" CHECK ("message_threads"."status" IN ('open', 'resolved', 'closed'))
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" text PRIMARY KEY NOT NULL,
	"thread_id" text NOT NULL,
	"sender_type" text NOT NULL,
	"sender_id" text NOT NULL,
	"body" text NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "messages_sender_type_chk" CHECK ("messages"."sender_type" IN ('customer', 'vendor'))
);
--> statement-breakpoint
CREATE TABLE "inventory_reservations" (
	"id" text PRIMARY KEY NOT NULL,
	"inventory_item_id" text NOT NULL,
	"cart_id" text,
	"order_id" text,
	"quantity" integer NOT NULL,
	"status" "inventory_reservation_status" DEFAULT 'active' NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_reservations_quantity_positive_chk" CHECK ("inventory_reservations"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "collection_metafields" (
	"id" text PRIMARY KEY NOT NULL,
	"vendor_id" text NOT NULL,
	"collection_id" text NOT NULL,
	"namespace" text NOT NULL,
	"key" text NOT NULL,
	"value_json" jsonb NOT NULL,
	"type" "metafield_type" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "collection_metafields_namespace_nonempty_chk" CHECK (length("collection_metafields"."namespace") > 0),
	CONSTRAINT "collection_metafields_key_nonempty_chk" CHECK (length("collection_metafields"."key") > 0)
);
--> statement-breakpoint
CREATE TABLE "customer_metafields" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"namespace" text NOT NULL,
	"key" text NOT NULL,
	"value_json" jsonb NOT NULL,
	"type" "metafield_type" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customer_metafields_namespace_nonempty_chk" CHECK (length("customer_metafields"."namespace") > 0),
	CONSTRAINT "customer_metafields_key_nonempty_chk" CHECK (length("customer_metafields"."key") > 0)
);
--> statement-breakpoint
CREATE TABLE "page_metafields" (
	"id" text PRIMARY KEY NOT NULL,
	"page_id" text NOT NULL,
	"namespace" text NOT NULL,
	"key" text NOT NULL,
	"value_json" jsonb NOT NULL,
	"type" "metafield_type" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "page_metafields_namespace_nonempty_chk" CHECK (length("page_metafields"."namespace") > 0),
	CONSTRAINT "page_metafields_key_nonempty_chk" CHECK (length("page_metafields"."key") > 0)
);
--> statement-breakpoint
CREATE TABLE "product_metafields" (
	"id" text PRIMARY KEY NOT NULL,
	"vendor_id" text NOT NULL,
	"product_id" text NOT NULL,
	"namespace" text NOT NULL,
	"key" text NOT NULL,
	"value_json" jsonb NOT NULL,
	"type" "metafield_type" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_metafields_namespace_nonempty_chk" CHECK (length("product_metafields"."namespace") > 0),
	CONSTRAINT "product_metafields_key_nonempty_chk" CHECK (length("product_metafields"."key") > 0)
);
--> statement-breakpoint
CREATE TABLE "variant_metafields" (
	"id" text PRIMARY KEY NOT NULL,
	"vendor_id" text NOT NULL,
	"variant_id" text NOT NULL,
	"namespace" text NOT NULL,
	"key" text NOT NULL,
	"value_json" jsonb NOT NULL,
	"type" "metafield_type" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "variant_metafields_namespace_nonempty_chk" CHECK (length("variant_metafields"."namespace") > 0),
	CONSTRAINT "variant_metafields_key_nonempty_chk" CHECK (length("variant_metafields"."key") > 0)
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"recipient_type" "notification_recipient_type" NOT NULL,
	"user_id" text,
	"customer_id" text,
	"vendor_id" text,
	"channel" "notification_channel" DEFAULT 'in_app' NOT NULL,
	"status" "notification_status" DEFAULT 'pending' NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"payload" jsonb,
	"is_read" boolean DEFAULT false NOT NULL,
	"sent_at" timestamp with time zone,
	"read_at" timestamp with time zone,
	"dismissed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notifications_recipient_consistency_chk" CHECK (
        ("notifications"."recipient_type" = 'user' AND "notifications"."user_id" IS NOT NULL AND "notifications"."customer_id" IS NULL) OR
        ("notifications"."recipient_type" = 'customer' AND "notifications"."customer_id" IS NOT NULL AND "notifications"."user_id" IS NULL)
      )
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"customer_id" text,
	"email_order_updates" boolean DEFAULT true NOT NULL,
	"email_promotions" boolean DEFAULT true NOT NULL,
	"email_newsletter" boolean DEFAULT true NOT NULL,
	"email_security_alerts" boolean DEFAULT true NOT NULL,
	"email_vendor_updates" boolean DEFAULT true NOT NULL,
	"email_review_reminders" boolean DEFAULT true NOT NULL,
	"in_app_order_updates" boolean DEFAULT true NOT NULL,
	"in_app_promotions" boolean DEFAULT false NOT NULL,
	"in_app_system_alerts" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_addresses" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"type" "order_address_type" NOT NULL,
	"first_name" text,
	"last_name" text,
	"company" text,
	"phone" text,
	"address1" text NOT NULL,
	"address2" text,
	"city" text NOT NULL,
	"province" text,
	"province_code" text,
	"country" text NOT NULL,
	"country_code" text NOT NULL,
	"zip" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_fulfillment_items" (
	"fulfillment_id" text NOT NULL,
	"vendor_order_id" text NOT NULL,
	"order_item_id" text NOT NULL,
	"quantity" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "order_fulfillment_items_pk" PRIMARY KEY("fulfillment_id","order_item_id"),
	CONSTRAINT "order_fulfillment_items_quantity_positive_chk" CHECK ("order_fulfillment_items"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "order_fulfillments" (
	"id" text PRIMARY KEY NOT NULL,
	"vendor_order_id" text NOT NULL,
	"vendor_id" text NOT NULL,
	"fulfillment_number" text NOT NULL,
	"status" "fulfillment_status" DEFAULT 'pending' NOT NULL,
	"carrier" text,
	"service" text,
	"tracking_number" text,
	"tracking_url" text,
	"fulfilled_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"vendor_order_id" text NOT NULL,
	"vendor_id" text NOT NULL,
	"product_id" text,
	"variant_id" text,
	"title" text NOT NULL,
	"variant_title" text,
	"sku" text,
	"quantity" integer NOT NULL,
	"fulfilled_quantity" integer DEFAULT 0 NOT NULL,
	"refunded_quantity" integer DEFAULT 0 NOT NULL,
	"unit_price" numeric(14, 2) NOT NULL,
	"line_subtotal" numeric(14, 2) NOT NULL,
	"discount_total" numeric(14, 2) DEFAULT '0' NOT NULL,
	"tax_total" numeric(14, 2) DEFAULT '0' NOT NULL,
	"total_price" numeric(14, 2) NOT NULL,
	"requires_shipping" boolean DEFAULT true NOT NULL,
	"status" "order_item_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "order_items_quantity_positive_chk" CHECK ("order_items"."quantity" > 0),
	CONSTRAINT "order_items_fulfilled_nonnegative_chk" CHECK ("order_items"."fulfilled_quantity" >= 0),
	CONSTRAINT "order_items_refunded_nonnegative_chk" CHECK ("order_items"."refunded_quantity" >= 0),
	CONSTRAINT "order_items_fulfilled_lte_quantity_chk" CHECK ("order_items"."fulfilled_quantity" <= "order_items"."quantity"),
	CONSTRAINT "order_items_refunded_lte_quantity_chk" CHECK ("order_items"."refunded_quantity" <= "order_items"."quantity"),
	CONSTRAINT "order_items_unit_price_nonnegative_chk" CHECK ("order_items"."unit_price" >= 0),
	CONSTRAINT "order_items_line_subtotal_nonnegative_chk" CHECK ("order_items"."line_subtotal" >= 0),
	CONSTRAINT "order_items_discount_nonnegative_chk" CHECK ("order_items"."discount_total" >= 0),
	CONSTRAINT "order_items_tax_nonnegative_chk" CHECK ("order_items"."tax_total" >= 0),
	CONSTRAINT "order_items_total_nonnegative_chk" CHECK ("order_items"."total_price" >= 0)
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" text PRIMARY KEY NOT NULL,
	"cart_id" text,
	"customer_id" text,
	"order_number" text NOT NULL,
	"status" "order_status" DEFAULT 'open' NOT NULL,
	"payment_status" "order_payment_status" DEFAULT 'pending' NOT NULL,
	"fulfillment_status" "order_fulfillment_status" DEFAULT 'unfulfilled' NOT NULL,
	"delivery_status" "order_delivery_status" DEFAULT 'not_shipped' NOT NULL,
	"currency_code" text DEFAULT 'USD' NOT NULL,
	"customer_email" text,
	"customer_first_name" text,
	"customer_last_name" text,
	"customer_phone" text,
	"channel" text,
	"delivery_method" text,
	"item_count" integer DEFAULT 0 NOT NULL,
	"subtotal_price" numeric(14, 2) NOT NULL,
	"discount_total" numeric(14, 2) DEFAULT '0' NOT NULL,
	"shipping_price" numeric(14, 2) DEFAULT '0' NOT NULL,
	"tax_total" numeric(14, 2) DEFAULT '0' NOT NULL,
	"total_price" numeric(14, 2) NOT NULL,
	"total_paid" numeric(14, 2) DEFAULT '0' NOT NULL,
	"total_refunded" numeric(14, 2) DEFAULT '0' NOT NULL,
	"note" text,
	"additional_details" jsonb,
	"tags" text[],
	"placed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paid_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_customer_email_lowercase_chk" CHECK ("orders"."customer_email" IS NULL OR "orders"."customer_email" = lower("orders"."customer_email")),
	CONSTRAINT "orders_item_count_nonnegative_chk" CHECK ("orders"."item_count" >= 0),
	CONSTRAINT "orders_subtotal_nonnegative_chk" CHECK ("orders"."subtotal_price" >= 0),
	CONSTRAINT "orders_discount_nonnegative_chk" CHECK ("orders"."discount_total" >= 0),
	CONSTRAINT "orders_shipping_nonnegative_chk" CHECK ("orders"."shipping_price" >= 0),
	CONSTRAINT "orders_tax_nonnegative_chk" CHECK ("orders"."tax_total" >= 0),
	CONSTRAINT "orders_total_nonnegative_chk" CHECK ("orders"."total_price" >= 0),
	CONSTRAINT "orders_total_paid_nonnegative_chk" CHECK ("orders"."total_paid" >= 0),
	CONSTRAINT "orders_total_refunded_nonnegative_chk" CHECK ("orders"."total_refunded" >= 0),
	CONSTRAINT "orders_refunded_lte_paid_chk" CHECK ("orders"."total_refunded" <= "orders"."total_paid")
);
--> statement-breakpoint
CREATE TABLE "vendor_order_addresses" (
	"id" text PRIMARY KEY NOT NULL,
	"vendor_order_id" text NOT NULL,
	"type" "order_address_type" NOT NULL,
	"first_name" text,
	"last_name" text,
	"company" text,
	"phone" text,
	"address1" text NOT NULL,
	"address2" text,
	"city" text NOT NULL,
	"province" text,
	"province_code" text,
	"country" text NOT NULL,
	"country_code" text NOT NULL,
	"zip" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendor_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"vendor_id" text NOT NULL,
	"vendor_order_number" text NOT NULL,
	"status" "order_status" DEFAULT 'open' NOT NULL,
	"payment_status" "order_payment_status" DEFAULT 'pending' NOT NULL,
	"fulfillment_status" "order_fulfillment_status" DEFAULT 'unfulfilled' NOT NULL,
	"delivery_status" "order_delivery_status" DEFAULT 'not_shipped' NOT NULL,
	"currency_code" text DEFAULT 'USD' NOT NULL,
	"item_count" integer DEFAULT 0 NOT NULL,
	"subtotal_price" numeric(14, 2) NOT NULL,
	"discount_total" numeric(14, 2) DEFAULT '0' NOT NULL,
	"shipping_price" numeric(14, 2) DEFAULT '0' NOT NULL,
	"tax_total" numeric(14, 2) DEFAULT '0' NOT NULL,
	"total_price" numeric(14, 2) NOT NULL,
	"total_paid" numeric(14, 2) DEFAULT '0' NOT NULL,
	"total_refunded" numeric(14, 2) DEFAULT '0' NOT NULL,
	"note" text,
	"placed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paid_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vendor_orders_item_count_nonnegative_chk" CHECK ("vendor_orders"."item_count" >= 0),
	CONSTRAINT "vendor_orders_subtotal_nonnegative_chk" CHECK ("vendor_orders"."subtotal_price" >= 0),
	CONSTRAINT "vendor_orders_discount_nonnegative_chk" CHECK ("vendor_orders"."discount_total" >= 0),
	CONSTRAINT "vendor_orders_shipping_nonnegative_chk" CHECK ("vendor_orders"."shipping_price" >= 0),
	CONSTRAINT "vendor_orders_tax_nonnegative_chk" CHECK ("vendor_orders"."tax_total" >= 0),
	CONSTRAINT "vendor_orders_total_nonnegative_chk" CHECK ("vendor_orders"."total_price" >= 0),
	CONSTRAINT "vendor_orders_total_paid_nonnegative_chk" CHECK ("vendor_orders"."total_paid" >= 0),
	CONSTRAINT "vendor_orders_total_refunded_nonnegative_chk" CHECK ("vendor_orders"."total_refunded" >= 0),
	CONSTRAINT "vendor_orders_refunded_lte_paid_chk" CHECK ("vendor_orders"."total_refunded" <= "vendor_orders"."total_paid")
);
--> statement-breakpoint
CREATE TABLE "payment_transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"payment_id" text NOT NULL,
	"type" "payment_transaction_type" NOT NULL,
	"status" "payment_transaction_status" DEFAULT 'pending' NOT NULL,
	"provider_transaction_id" text,
	"amount" numeric(14, 2) NOT NULL,
	"currency_code" text NOT NULL,
	"raw_response" jsonb,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_transactions_amount_nonnegative_chk" CHECK ("payment_transactions"."amount" >= 0)
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"customer_id" text,
	"provider" "payment_provider" NOT NULL,
	"provider_payment_id" text,
	"currency_code" text NOT NULL,
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"amount_authorized" numeric(14, 2) DEFAULT '0' NOT NULL,
	"amount_captured" numeric(14, 2) DEFAULT '0' NOT NULL,
	"amount_refunded" numeric(14, 2) DEFAULT '0' NOT NULL,
	"is_test" boolean DEFAULT false NOT NULL,
	"metadata" jsonb,
	"authorized_at" timestamp with time zone,
	"captured_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_amount_authorized_nonnegative_chk" CHECK ("payments"."amount_authorized" >= 0),
	CONSTRAINT "payments_amount_captured_nonnegative_chk" CHECK ("payments"."amount_captured" >= 0),
	CONSTRAINT "payments_amount_refunded_nonnegative_chk" CHECK ("payments"."amount_refunded" >= 0),
	CONSTRAINT "payments_refunded_lte_captured_chk" CHECK ("payments"."amount_refunded" <= "payments"."amount_captured")
);
--> statement-breakpoint
CREATE TABLE "vendor_order_financials" (
	"id" text PRIMARY KEY NOT NULL,
	"vendor_order_id" text NOT NULL,
	"vendor_id" text NOT NULL,
	"gross_sales" numeric(14, 2) NOT NULL,
	"discount_total" numeric(14, 2) DEFAULT '0' NOT NULL,
	"shipping_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"tax_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"refunded_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"commission_bps_snapshot" numeric(5, 0) NOT NULL,
	"commission_amount" numeric(14, 2) NOT NULL,
	"net_payable" numeric(14, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vendor_order_financials_gross_sales_nonnegative_chk" CHECK ("vendor_order_financials"."gross_sales" >= 0),
	CONSTRAINT "vendor_order_financials_discount_nonnegative_chk" CHECK ("vendor_order_financials"."discount_total" >= 0),
	CONSTRAINT "vendor_order_financials_shipping_nonnegative_chk" CHECK ("vendor_order_financials"."shipping_amount" >= 0),
	CONSTRAINT "vendor_order_financials_tax_nonnegative_chk" CHECK ("vendor_order_financials"."tax_amount" >= 0),
	CONSTRAINT "vendor_order_financials_refunded_nonnegative_chk" CHECK ("vendor_order_financials"."refunded_amount" >= 0),
	CONSTRAINT "vendor_order_financials_commission_bps_range_chk" CHECK ("vendor_order_financials"."commission_bps_snapshot" >= 0 AND "vendor_order_financials"."commission_bps_snapshot" <= 10000)
);
--> statement-breakpoint
CREATE TABLE "vendor_payout_items" (
	"id" text PRIMARY KEY NOT NULL,
	"payout_id" text NOT NULL,
	"vendor_order_id" text NOT NULL,
	"vendor_order_financial_id" text,
	"amount" numeric(14, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vendor_payout_items_amount_nonnegative_chk" CHECK ("vendor_payout_items"."amount" >= 0)
);
--> statement-breakpoint
CREATE TABLE "vendor_payouts" (
	"id" text PRIMARY KEY NOT NULL,
	"vendor_id" text NOT NULL,
	"status" "vendor_payout_status" DEFAULT 'pending' NOT NULL,
	"currency_code" text NOT NULL,
	"total_amount" numeric(14, 2) NOT NULL,
	"reference" text,
	"note" text,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vendor_payouts_total_amount_nonnegative_chk" CHECK ("vendor_payouts"."total_amount" >= 0)
);
--> statement-breakpoint
CREATE TABLE "inventory_adjustments" (
	"id" text PRIMARY KEY NOT NULL,
	"inventory_item_id" text NOT NULL,
	"reason" "inventory_adjustment_reason" NOT NULL,
	"delta" integer NOT NULL,
	"note" text,
	"reference_type" text,
	"reference_id" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_items" (
	"id" text PRIMARY KEY NOT NULL,
	"vendor_id" text NOT NULL,
	"variant_id" text NOT NULL,
	"tracked" boolean DEFAULT true NOT NULL,
	"available_quantity" integer DEFAULT 0 NOT NULL,
	"reserved_quantity" integer DEFAULT 0 NOT NULL,
	"incoming_quantity" integer DEFAULT 0 NOT NULL,
	"reorder_threshold" integer,
	"allow_backorder" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_items_available_nonnegative_chk" CHECK ("inventory_items"."available_quantity" >= 0),
	CONSTRAINT "inventory_items_reserved_nonnegative_chk" CHECK ("inventory_items"."reserved_quantity" >= 0),
	CONSTRAINT "inventory_items_incoming_nonnegative_chk" CHECK ("inventory_items"."incoming_quantity" >= 0),
	CONSTRAINT "inventory_items_reorder_threshold_nonnegative_chk" CHECK ("inventory_items"."reorder_threshold" IS NULL OR "inventory_items"."reorder_threshold" >= 0)
);
--> statement-breakpoint
CREATE TABLE "product_images" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"url" text NOT NULL,
	"alt_text" text,
	"position" integer DEFAULT 0 NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_images_position_nonnegative_chk" CHECK ("product_images"."position" >= 0)
);
--> statement-breakpoint
CREATE TABLE "product_media" (
	"product_id" text NOT NULL,
	"file_id" text NOT NULL,
	"alt_text" text,
	"position" integer DEFAULT 0 NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_media_pk" PRIMARY KEY("product_id","file_id"),
	CONSTRAINT "product_media_position_nonnegative_chk" CHECK ("product_media"."position" >= 0)
);
--> statement-breakpoint
CREATE TABLE "product_option_values" (
	"id" text PRIMARY KEY NOT NULL,
	"option_id" text NOT NULL,
	"value" text NOT NULL,
	"swatch_color" text,
	"swatch_file_id" text,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_option_values_position_nonnegative_chk" CHECK ("product_option_values"."position" >= 0)
);
--> statement-breakpoint
CREATE TABLE "product_options" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"name" text NOT NULL,
	"display_type" "option_display_type" DEFAULT 'text' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_options_position_nonnegative_chk" CHECK ("product_options"."position" >= 0)
);
--> statement-breakpoint
CREATE TABLE "product_tags" (
	"product_id" text NOT NULL,
	"tag" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_tags_pk" PRIMARY KEY("product_id","tag")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" text PRIMARY KEY NOT NULL,
	"vendor_id" text NOT NULL,
	"title" text NOT NULL,
	"handle" text NOT NULL,
	"description" text,
	"excerpt" text,
	"status" "product_status" DEFAULT 'draft' NOT NULL,
	"product_type" text,
	"brand" text,
	"featured_file_id" text,
	"seo_title" text,
	"seo_description" text,
	"seo_canonical_url" text,
	"is_configurable" boolean DEFAULT false NOT NULL,
	"configurator_lead_time_days" integer,
	"published_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "products_handle_lowercase_chk" CHECK ("products"."handle" = lower("products"."handle"))
);
--> statement-breakpoint
CREATE TABLE "variant_images" (
	"id" text PRIMARY KEY NOT NULL,
	"variant_id" text NOT NULL,
	"url" text NOT NULL,
	"alt_text" text,
	"position" integer DEFAULT 0 NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "variant_images_position_nonnegative_chk" CHECK ("variant_images"."position" >= 0)
);
--> statement-breakpoint
CREATE TABLE "variant_media" (
	"variant_id" text NOT NULL,
	"file_id" text NOT NULL,
	"alt_text" text,
	"position" integer DEFAULT 0 NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "variant_media_pk" PRIMARY KEY("variant_id","file_id"),
	CONSTRAINT "variant_media_position_nonnegative_chk" CHECK ("variant_media"."position" >= 0)
);
--> statement-breakpoint
CREATE TABLE "variant_selected_options" (
	"variant_id" text NOT NULL,
	"option_id" text NOT NULL,
	"option_value_id" text NOT NULL,
	CONSTRAINT "variant_selected_options_pk" PRIMARY KEY("variant_id","option_id")
);
--> statement-breakpoint
CREATE TABLE "variants" (
	"id" text PRIMARY KEY NOT NULL,
	"vendor_id" text NOT NULL,
	"product_id" text NOT NULL,
	"title" text,
	"sku" text,
	"barcode" text,
	"status" "variant_status" DEFAULT 'active' NOT NULL,
	"price" numeric(12, 2) NOT NULL,
	"compare_at_price" numeric(12, 2),
	"cost_per_item" numeric(12, 2),
	"taxable" boolean DEFAULT true NOT NULL,
	"inventory_tracked" boolean DEFAULT true NOT NULL,
	"inventory_policy" "inventory_policy" DEFAULT 'deny' NOT NULL,
	"requires_shipping" boolean DEFAULT true NOT NULL,
	"weight_value" numeric(10, 3),
	"weight_unit" "weight_unit" DEFAULT 'kg',
	"country_of_origin" text,
	"harmonized_system_code" text,
	"featured_file_id" text,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "variants_price_nonnegative_chk" CHECK ("variants"."price" >= 0),
	CONSTRAINT "variants_compare_at_price_nonnegative_chk" CHECK ("variants"."compare_at_price" IS NULL OR "variants"."compare_at_price" >= 0),
	CONSTRAINT "variants_cost_per_item_nonnegative_chk" CHECK ("variants"."cost_per_item" IS NULL OR "variants"."cost_per_item" >= 0),
	CONSTRAINT "variants_compare_at_price_gte_price_chk" CHECK ("variants"."compare_at_price" IS NULL OR "variants"."compare_at_price" >= "variants"."price"),
	CONSTRAINT "variants_weight_value_nonnegative_chk" CHECK ("variants"."weight_value" IS NULL OR "variants"."weight_value" >= 0),
	CONSTRAINT "variants_position_nonnegative_chk" CHECK ("variants"."position" >= 0)
);
--> statement-breakpoint
CREATE TABLE "product_config_option_values" (
	"id" text PRIMARY KEY NOT NULL,
	"option_id" text NOT NULL,
	"value" text NOT NULL,
	"price_modifier" numeric(14, 2) DEFAULT '0' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_config_options" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"required" boolean DEFAULT true NOT NULL,
	"help_text" text,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_config_options_type_chk" CHECK ("product_config_options"."type" IN ('select', 'text', 'number'))
);
--> statement-breakpoint
CREATE TABLE "refund_items" (
	"id" text PRIMARY KEY NOT NULL,
	"refund_id" text NOT NULL,
	"order_item_id" text NOT NULL,
	"quantity" integer NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "refund_items_quantity_positive_chk" CHECK ("refund_items"."quantity" > 0),
	CONSTRAINT "refund_items_amount_nonnegative_chk" CHECK ("refund_items"."amount" >= 0)
);
--> statement-breakpoint
CREATE TABLE "refunds" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"vendor_order_id" text,
	"payment_id" text,
	"status" "refund_status" DEFAULT 'pending' NOT NULL,
	"reason" "refund_reason",
	"note" text,
	"items_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"shipping_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"tax_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"total_amount" numeric(14, 2) NOT NULL,
	"created_by" text,
	"provider_refund_id" text,
	"provider_error" text,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "refunds_items_amount_nonnegative_chk" CHECK ("refunds"."items_amount" >= 0),
	CONSTRAINT "refunds_shipping_amount_nonnegative_chk" CHECK ("refunds"."shipping_amount" >= 0),
	CONSTRAINT "refunds_tax_amount_nonnegative_chk" CHECK ("refunds"."tax_amount" >= 0),
	CONSTRAINT "refunds_total_amount_nonnegative_chk" CHECK ("refunds"."total_amount" >= 0)
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"token_hash" text NOT NULL,
	"actor_type" "actor_type" NOT NULL,
	"user_id" text,
	"customer_id" text,
	"vendor_id" text,
	"vendor_role" text,
	"admin_role" text,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "refresh_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "return_items" (
	"id" text PRIMARY KEY NOT NULL,
	"return_id" text NOT NULL,
	"order_item_id" text NOT NULL,
	"quantity" integer NOT NULL,
	"reason" "return_reason",
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "return_items_quantity_positive_chk" CHECK ("return_items"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "returns" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"vendor_order_id" text,
	"customer_id" text,
	"status" "return_status" DEFAULT 'requested' NOT NULL,
	"reason" "return_reason",
	"note" text,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"approved_at" timestamp with time zone,
	"rejected_at" timestamp with time zone,
	"received_at" timestamp with time zone,
	"processed_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_review_media" (
	"review_id" text NOT NULL,
	"file_id" text NOT NULL,
	"alt_text" text,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_review_media_pk" PRIMARY KEY("review_id","file_id"),
	CONSTRAINT "product_review_media_position_nonnegative_chk" CHECK ("product_review_media"."position" >= 0)
);
--> statement-breakpoint
CREATE TABLE "product_reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"vendor_id" text NOT NULL,
	"product_id" text NOT NULL,
	"variant_id" text,
	"customer_id" text,
	"order_item_id" text,
	"author_name" text,
	"author_email" text,
	"rating" integer NOT NULL,
	"title" text,
	"body" text,
	"status" "review_status" DEFAULT 'pending' NOT NULL,
	"verified_purchase" boolean DEFAULT false NOT NULL,
	"helpful_count" integer DEFAULT 0 NOT NULL,
	"moderation_reason" text,
	"moderated_by" text,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_reviews_rating_range_chk" CHECK ("product_reviews"."rating" >= 1 AND "product_reviews"."rating" <= 5),
	CONSTRAINT "product_reviews_helpful_count_nonnegative_chk" CHECK ("product_reviews"."helpful_count" >= 0),
	CONSTRAINT "product_reviews_author_email_lowercase_chk" CHECK ("product_reviews"."author_email" IS NULL OR "product_reviews"."author_email" = lower("product_reviews"."author_email"))
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text,
	"updated_by" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_notify_subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"variant_id" text NOT NULL,
	"email" text NOT NULL,
	"customer_id" text,
	"notified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stock_notify_email_lowercase_chk" CHECK ("stock_notify_subscriptions"."email" = lower("stock_notify_subscriptions"."email"))
);
--> statement-breakpoint
CREATE TABLE "shipping_rates" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"zone_id" varchar(36) NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" "shipping_rate_type" DEFAULT 'flat_rate' NOT NULL,
	"price" integer DEFAULT 0 NOT NULL,
	"min_weight" integer,
	"max_weight" integer,
	"min_order_amount" integer,
	"max_order_amount" integer,
	"free_above_amount" integer,
	"estimated_days_min" integer,
	"estimated_days_max" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shipping_zones" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"countries" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_rest_of_world" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"vendor_id" text NOT NULL,
	"variant_id" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"currency_code" text DEFAULT 'USD' NOT NULL,
	"unit_price" numeric(12, 2) NOT NULL,
	"interval_count" integer DEFAULT 1 NOT NULL,
	"interval" "subscription_interval" DEFAULT 'month' NOT NULL,
	"status" "subscription_status" DEFAULT 'active' NOT NULL,
	"next_billing_at" timestamp with time zone NOT NULL,
	"current_period_start" timestamp with time zone,
	"current_period_end" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"paused_at" timestamp with time zone,
	"resumed_at" timestamp with time zone,
	"payment_method_token" text,
	"shipping_address" jsonb,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tax_rates" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"zone_id" varchar(36) NOT NULL,
	"name" varchar(255) NOT NULL,
	"rate_bps" integer DEFAULT 0 NOT NULL,
	"is_compound" boolean DEFAULT false NOT NULL,
	"is_shipping_taxed" boolean DEFAULT false NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tax_zones" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"country_code" varchar(2) NOT NULL,
	"province_code" varchar(10),
	"behavior" "tax_behavior" DEFAULT 'exclusive' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text,
	"first_name" text,
	"last_name" text,
	"phone" text,
	"avatar_url" text,
	"platform_role" "platform_role",
	"is_active" boolean DEFAULT true NOT NULL,
	"email_verified_at" timestamp with time zone,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "users_email_lowercase_chk" CHECK ("users"."email" = lower("users"."email"))
);
--> statement-breakpoint
CREATE TABLE "user_2fa" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"secret" text NOT NULL,
	"is_enabled" boolean DEFAULT false NOT NULL,
	"backup_codes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"backup_codes_used" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_2fa_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "vendor_addresses" (
	"id" text PRIMARY KEY NOT NULL,
	"vendor_id" text NOT NULL,
	"type" "vendor_address_type" NOT NULL,
	"label" text,
	"contact_name" text,
	"company" text,
	"phone" text,
	"email" text,
	"address1" text NOT NULL,
	"address2" text,
	"city" text NOT NULL,
	"province" text,
	"province_code" text,
	"country" text NOT NULL,
	"country_code" text NOT NULL,
	"zip" text NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "vendor_kyc_documents" (
	"id" text PRIMARY KEY NOT NULL,
	"vendor_kyc_id" text NOT NULL,
	"document_type" "vendor_kyc_document_type" NOT NULL,
	"file_id" text NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendor_kycs" (
	"id" text PRIMARY KEY NOT NULL,
	"vendor_id" text NOT NULL,
	"status" "vendor_kyc_status" DEFAULT 'pending' NOT NULL,
	"submitted_at" timestamp with time zone,
	"reviewed_at" timestamp with time zone,
	"reviewed_by" text,
	"rejection_reason" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendor_memberships" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"vendor_id" text NOT NULL,
	"role" "vendor_member_role" NOT NULL,
	"status" "vendor_membership_status" DEFAULT 'invited' NOT NULL,
	"invited_by" text,
	"revoked_by" text,
	"joined_at" timestamp with time zone,
	"accepted_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"last_access_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendors" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"legal_name" text,
	"slug" text NOT NULL,
	"status" "vendor_status" DEFAULT 'pending' NOT NULL,
	"bio" text,
	"logo_url" text,
	"banner_url" text,
	"website_url" text,
	"primary_email" text,
	"support_email" text,
	"billing_email" text,
	"primary_phone" text,
	"support_phone" text,
	"country_code" text,
	"currency_code" text,
	"timezone" text,
	"vat_number" text,
	"tax_id" text,
	"registration_number" text,
	"seo_title" text,
	"seo_description" text,
	"commission_bps" integer DEFAULT 0 NOT NULL,
	"onboarding_completed_at" timestamp with time zone,
	"approved_at" timestamp with time zone,
	"suspended_at" timestamp with time zone,
	"suspension_reason" text,
	"rejected_at" timestamp with time zone,
	"rejection_reason" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "vendors_slug_lowercase_chk" CHECK ("vendors"."slug" = lower("vendors"."slug")),
	CONSTRAINT "vendors_primary_email_lowercase_chk" CHECK ("vendors"."primary_email" IS NULL OR "vendors"."primary_email" = lower("vendors"."primary_email")),
	CONSTRAINT "vendors_support_email_lowercase_chk" CHECK ("vendors"."support_email" IS NULL OR "vendors"."support_email" = lower("vendors"."support_email")),
	CONSTRAINT "vendors_billing_email_lowercase_chk" CHECK ("vendors"."billing_email" IS NULL OR "vendors"."billing_email" = lower("vendors"."billing_email")),
	CONSTRAINT "vendors_commission_bps_range_chk" CHECK ("vendors"."commission_bps" >= 0 AND "vendors"."commission_bps" <= 10000)
);
--> statement-breakpoint
CREATE TABLE "webhook_deliveries" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"endpoint_id" text NOT NULL,
	"status" "webhook_delivery_status" DEFAULT 'pending' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"request_headers" jsonb,
	"request_body" jsonb,
	"response_status_code" integer,
	"response_headers" jsonb,
	"response_body" text,
	"next_retry_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"last_attempt_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "webhook_deliveries_attempt_count_nonnegative_chk" CHECK ("webhook_deliveries"."attempt_count" >= 0),
	CONSTRAINT "webhook_deliveries_response_status_code_valid_chk" CHECK ("webhook_deliveries"."response_status_code" IS NULL OR ("webhook_deliveries"."response_status_code" >= 100 AND "webhook_deliveries"."response_status_code" <= 599))
);
--> statement-breakpoint
CREATE TABLE "webhook_endpoints" (
	"id" text PRIMARY KEY NOT NULL,
	"target_url" text NOT NULL,
	"secret" text NOT NULL,
	"status" "webhook_endpoint_status" DEFAULT 'active' NOT NULL,
	"description" text,
	"subscribed_events" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"id" text PRIMARY KEY NOT NULL,
	"event_type" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" "webhook_event_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "wishlist_items" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"product_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "newsletter_campaigns" (
	"id" text PRIMARY KEY NOT NULL,
	"subject" text NOT NULL,
	"body_html" text NOT NULL,
	"body_text" text,
	"segment_id" text,
	"recipient_count" integer DEFAULT 0 NOT NULL,
	"sent_at" timestamp with time zone,
	"sent_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "newsletter_subscribers" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"subscribed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"unsubscribed_at" timestamp with time zone,
	CONSTRAINT "newsletter_subscribers_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "campaigns_handle_unique" ON "campaigns" USING btree ("handle") WHERE "campaigns"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "cart_items_cart_variant_unique" ON "cart_items" USING btree ("cart_id","variant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "carts_token_unique" ON "carts" USING btree ("token") WHERE "carts"."token" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "collection_products_collection_position_unique" ON "collection_products" USING btree ("collection_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "collection_rules_collection_position_unique" ON "collection_rules" USING btree ("collection_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "collections_vendor_handle_unique" ON "collections" USING btree ("vendor_id","handle") WHERE "collections"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "blog_posts_blog_handle_unique" ON "blog_posts" USING btree ("blog_id","handle") WHERE "blog_posts"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "blog_tags_handle_unique" ON "blog_tags" USING btree ("handle") WHERE "blog_tags"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "blogs_handle_unique" ON "blogs" USING btree ("handle") WHERE "blogs"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "pages_handle_unique" ON "pages" USING btree ("handle") WHERE "pages"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "customer_addresses_default_shipping_unique" ON "customer_addresses" USING btree ("customer_id") WHERE "customer_addresses"."is_default_shipping" = true AND "customer_addresses"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "customer_addresses_default_billing_unique" ON "customer_addresses" USING btree ("customer_id") WHERE "customer_addresses"."is_default_billing" = true AND "customer_addresses"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "customer_segments_slug_unique" ON "customer_segments" USING btree ("slug") WHERE "customer_segments"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "customers_email_unique" ON "customers" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "cart_applied_discounts_cart_code_unique" ON "cart_applied_discounts" USING btree ("cart_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "discount_codes_code_unique" ON "discount_codes" USING btree ("code") WHERE "discount_codes"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "order_applied_discounts_order_code_unique" ON "order_applied_discounts" USING btree ("order_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "vendor_order_applied_discounts_vendor_order_code_unique" ON "vendor_order_applied_discounts" USING btree ("vendor_order_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "facet_filters_scope_key_unique" ON "facet_filters" USING btree ("vendor_id","key") WHERE "facet_filters"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "files_storage_key_unique" ON "files" USING btree ("storage_key");--> statement-breakpoint
CREATE UNIQUE INDEX "gift_cards_code_unique" ON "gift_cards" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "loyalty_ledger_order_earn_unique" ON "loyalty_ledger" USING btree ("customer_id","order_id","type") WHERE "loyalty_ledger"."type" = 'earn' AND "loyalty_ledger"."order_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "collection_metafields_collection_namespace_key_unique" ON "collection_metafields" USING btree ("collection_id","namespace","key");--> statement-breakpoint
CREATE UNIQUE INDEX "customer_metafields_customer_namespace_key_unique" ON "customer_metafields" USING btree ("customer_id","namespace","key");--> statement-breakpoint
CREATE UNIQUE INDEX "page_metafields_page_namespace_key_unique" ON "page_metafields" USING btree ("page_id","namespace","key");--> statement-breakpoint
CREATE UNIQUE INDEX "product_metafields_product_namespace_key_unique" ON "product_metafields" USING btree ("product_id","namespace","key");--> statement-breakpoint
CREATE UNIQUE INDEX "variant_metafields_variant_namespace_key_unique" ON "variant_metafields" USING btree ("variant_id","namespace","key");--> statement-breakpoint
CREATE UNIQUE INDEX "order_addresses_order_type_unique" ON "order_addresses" USING btree ("order_id","type");--> statement-breakpoint
CREATE UNIQUE INDEX "order_fulfillments_number_unique" ON "order_fulfillments" USING btree ("fulfillment_number");--> statement-breakpoint
CREATE UNIQUE INDEX "order_fulfillments_id_vendor_order_unique" ON "order_fulfillments" USING btree ("id","vendor_order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "order_items_id_vendor_order_unique" ON "order_items" USING btree ("id","vendor_order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_order_number_unique" ON "orders" USING btree ("order_number");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_id_order_number_unique" ON "orders" USING btree ("id","order_number");--> statement-breakpoint
CREATE UNIQUE INDEX "vendor_order_addresses_vendor_order_type_unique" ON "vendor_order_addresses" USING btree ("vendor_order_id","type");--> statement-breakpoint
CREATE UNIQUE INDEX "vendor_orders_number_unique" ON "vendor_orders" USING btree ("vendor_order_number");--> statement-breakpoint
CREATE UNIQUE INDEX "vendor_orders_order_vendor_unique" ON "vendor_orders" USING btree ("order_id","vendor_id");--> statement-breakpoint
CREATE UNIQUE INDEX "vendor_orders_id_order_vendor_unique" ON "vendor_orders" USING btree ("id","order_id","vendor_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_transactions_provider_transaction_unique" ON "payment_transactions" USING btree ("provider_transaction_id") WHERE "payment_transactions"."provider_transaction_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "payments_provider_payment_id_unique" ON "payments" USING btree ("provider","provider_payment_id") WHERE "payments"."provider_payment_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "vendor_order_financials_vendor_order_unique" ON "vendor_order_financials" USING btree ("vendor_order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "vendor_payout_items_vendor_order_unique" ON "vendor_payout_items" USING btree ("vendor_order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_items_variant_unique" ON "inventory_items" USING btree ("variant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "product_images_product_position_unique" ON "product_images" USING btree ("product_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "product_images_product_featured_unique" ON "product_images" USING btree ("product_id") WHERE "product_images"."is_featured" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "product_media_product_position_unique" ON "product_media" USING btree ("product_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "product_media_product_featured_unique" ON "product_media" USING btree ("product_id") WHERE "product_media"."is_featured" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "product_option_values_id_option_unique" ON "product_option_values" USING btree ("id","option_id");--> statement-breakpoint
CREATE UNIQUE INDEX "product_option_values_option_value_unique" ON "product_option_values" USING btree ("option_id","value");--> statement-breakpoint
CREATE UNIQUE INDEX "product_option_values_option_position_unique" ON "product_option_values" USING btree ("option_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "product_options_id_product_unique" ON "product_options" USING btree ("id","product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "product_options_product_name_unique" ON "product_options" USING btree ("product_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "product_options_product_position_unique" ON "product_options" USING btree ("product_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "products_vendor_handle_unique" ON "products" USING btree ("vendor_id","handle") WHERE "products"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "products_id_vendor_unique" ON "products" USING btree ("id","vendor_id");--> statement-breakpoint
CREATE UNIQUE INDEX "variant_images_variant_position_unique" ON "variant_images" USING btree ("variant_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "variant_images_variant_featured_unique" ON "variant_images" USING btree ("variant_id") WHERE "variant_images"."is_featured" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "variant_media_variant_position_unique" ON "variant_media" USING btree ("variant_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "variant_media_variant_featured_unique" ON "variant_media" USING btree ("variant_id") WHERE "variant_media"."is_featured" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "variant_selected_options_variant_option_value_unique" ON "variant_selected_options" USING btree ("variant_id","option_value_id");--> statement-breakpoint
CREATE UNIQUE INDEX "variants_id_vendor_unique" ON "variants" USING btree ("id","vendor_id");--> statement-breakpoint
CREATE UNIQUE INDEX "variants_vendor_sku_unique" ON "variants" USING btree ("vendor_id","sku") WHERE "variants"."sku" IS NOT NULL AND "variants"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "variants_product_position_unique" ON "variants" USING btree ("product_id","position") WHERE "variants"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "product_review_media_review_position_unique" ON "product_review_media" USING btree ("review_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "product_reviews_order_item_unique" ON "product_reviews" USING btree ("order_item_id") WHERE "product_reviews"."order_item_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "settings_key_unique" ON "settings" USING btree ("key");--> statement-breakpoint
CREATE UNIQUE INDEX "stock_notify_variant_email_unique" ON "stock_notify_subscriptions" USING btree ("variant_id","email");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "vendor_addresses_default_per_type_unique" ON "vendor_addresses" USING btree ("vendor_id","type") WHERE "vendor_addresses"."is_default" = true AND "vendor_addresses"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "vendor_memberships_user_vendor_unique" ON "vendor_memberships" USING btree ("user_id","vendor_id");--> statement-breakpoint
CREATE UNIQUE INDEX "vendors_slug_unique" ON "vendors" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "webhook_deliveries_event_endpoint_unique" ON "webhook_deliveries" USING btree ("event_id","endpoint_id");--> statement-breakpoint
CREATE UNIQUE INDEX "wishlist_items_customer_product_unique" ON "wishlist_items" USING btree ("customer_id","product_id");--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_events" ADD CONSTRAINT "campaign_events_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_events" ADD CONSTRAINT "campaign_events_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_events" ADD CONSTRAINT "campaign_events_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_item_discount_allocations" ADD CONSTRAINT "cart_item_discount_allocations_cart_item_id_cart_items_id_fk" FOREIGN KEY ("cart_item_id") REFERENCES "public"."cart_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cart_id_carts_id_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."carts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_product_vendor_fk" FOREIGN KEY ("product_id","vendor_id") REFERENCES "public"."products"("id","vendor_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_variant_vendor_fk" FOREIGN KEY ("variant_id","vendor_id") REFERENCES "public"."variants"("id","vendor_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carts" ADD CONSTRAINT "carts_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_products" ADD CONSTRAINT "collection_products_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_products" ADD CONSTRAINT "collection_products_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_rules" ADD CONSTRAINT "collection_rules_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collections" ADD CONSTRAINT "collections_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collections" ADD CONSTRAINT "collections_image_file_id_files_id_fk" FOREIGN KEY ("image_file_id") REFERENCES "public"."files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collections" ADD CONSTRAINT "collections_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collections" ADD CONSTRAINT "collections_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_rules" ADD CONSTRAINT "commission_rules_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_post_tags" ADD CONSTRAINT "blog_post_tags_blog_post_id_blog_posts_id_fk" FOREIGN KEY ("blog_post_id") REFERENCES "public"."blog_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_post_tags" ADD CONSTRAINT "blog_post_tags_tag_id_blog_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."blog_tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_blog_id_blogs_id_fk" FOREIGN KEY ("blog_id") REFERENCES "public"."blogs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_featured_image_file_id_files_id_fk" FOREIGN KEY ("featured_image_file_id") REFERENCES "public"."files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blogs" ADD CONSTRAINT "blogs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blogs" ADD CONSTRAINT "blogs_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pages" ADD CONSTRAINT "pages_og_image_file_id_files_id_fk" FOREIGN KEY ("og_image_file_id") REFERENCES "public"."files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pages" ADD CONSTRAINT "pages_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pages" ADD CONSTRAINT "pages_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_addresses" ADD CONSTRAINT "customer_addresses_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_segment_members" ADD CONSTRAINT "customer_segment_members_segment_id_customer_segments_id_fk" FOREIGN KEY ("segment_id") REFERENCES "public"."customer_segments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_segment_members" ADD CONSTRAINT "customer_segment_members_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_tags" ADD CONSTRAINT "customer_tags_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_applied_discounts" ADD CONSTRAINT "cart_applied_discounts_cart_id_carts_id_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."carts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_applied_discounts" ADD CONSTRAINT "cart_applied_discounts_discount_id_discounts_id_fk" FOREIGN KEY ("discount_id") REFERENCES "public"."discounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_applied_discounts" ADD CONSTRAINT "cart_applied_discounts_discount_code_id_discount_codes_id_fk" FOREIGN KEY ("discount_code_id") REFERENCES "public"."discount_codes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discount_codes" ADD CONSTRAINT "discount_codes_discount_id_discounts_id_fk" FOREIGN KEY ("discount_id") REFERENCES "public"."discounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discount_collections" ADD CONSTRAINT "discount_collections_discount_id_discounts_id_fk" FOREIGN KEY ("discount_id") REFERENCES "public"."discounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discount_products" ADD CONSTRAINT "discount_products_discount_id_discounts_id_fk" FOREIGN KEY ("discount_id") REFERENCES "public"."discounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discount_redemptions" ADD CONSTRAINT "discount_redemptions_discount_id_discounts_id_fk" FOREIGN KEY ("discount_id") REFERENCES "public"."discounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discount_redemptions" ADD CONSTRAINT "discount_redemptions_discount_code_id_discount_codes_id_fk" FOREIGN KEY ("discount_code_id") REFERENCES "public"."discount_codes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discount_redemptions" ADD CONSTRAINT "discount_redemptions_cart_id_carts_id_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."carts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discount_redemptions" ADD CONSTRAINT "discount_redemptions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discount_redemptions" ADD CONSTRAINT "discount_redemptions_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discount_vendor_targets" ADD CONSTRAINT "discount_vendor_targets_discount_id_discounts_id_fk" FOREIGN KEY ("discount_id") REFERENCES "public"."discounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discount_vendor_targets" ADD CONSTRAINT "discount_vendor_targets_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discounts" ADD CONSTRAINT "discounts_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discounts" ADD CONSTRAINT "discounts_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_applied_discounts" ADD CONSTRAINT "order_applied_discounts_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_applied_discounts" ADD CONSTRAINT "order_applied_discounts_discount_id_discounts_id_fk" FOREIGN KEY ("discount_id") REFERENCES "public"."discounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_applied_discounts" ADD CONSTRAINT "order_applied_discounts_discount_code_id_discount_codes_id_fk" FOREIGN KEY ("discount_code_id") REFERENCES "public"."discount_codes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_order_applied_discounts" ADD CONSTRAINT "vendor_order_applied_discounts_vendor_order_id_vendor_orders_id_fk" FOREIGN KEY ("vendor_order_id") REFERENCES "public"."vendor_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_order_applied_discounts" ADD CONSTRAINT "vendor_order_applied_discounts_discount_id_discounts_id_fk" FOREIGN KEY ("discount_id") REFERENCES "public"."discounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_order_applied_discounts" ADD CONSTRAINT "vendor_order_applied_discounts_discount_code_id_discount_codes_id_fk" FOREIGN KEY ("discount_code_id") REFERENCES "public"."discount_codes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facet_filters" ADD CONSTRAINT "facet_filters_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facet_filters" ADD CONSTRAINT "facet_filters_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facet_filters" ADD CONSTRAINT "facet_filters_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_card_transactions" ADD CONSTRAINT "gift_card_transactions_gift_card_id_gift_cards_id_fk" FOREIGN KEY ("gift_card_id") REFERENCES "public"."gift_cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_card_transactions" ADD CONSTRAINT "gift_card_transactions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_cards" ADD CONSTRAINT "gift_cards_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_cards" ADD CONSTRAINT "gift_cards_issued_by_user_id_users_id_fk" FOREIGN KEY ("issued_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_ledger" ADD CONSTRAINT "loyalty_ledger_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_ledger" ADD CONSTRAINT "loyalty_ledger_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_threads" ADD CONSTRAINT "message_threads_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_threads" ADD CONSTRAINT "message_threads_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_threads" ADD CONSTRAINT "message_threads_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_threads" ADD CONSTRAINT "message_threads_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_thread_id_message_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."message_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_cart_id_carts_id_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."carts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_metafields" ADD CONSTRAINT "collection_metafields_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_metafields" ADD CONSTRAINT "collection_metafields_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_metafields" ADD CONSTRAINT "customer_metafields_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_metafields" ADD CONSTRAINT "page_metafields_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_metafields" ADD CONSTRAINT "product_metafields_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_metafields" ADD CONSTRAINT "product_metafields_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variant_metafields" ADD CONSTRAINT "variant_metafields_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variant_metafields" ADD CONSTRAINT "variant_metafields_variant_id_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_addresses" ADD CONSTRAINT "order_addresses_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_fulfillment_items" ADD CONSTRAINT "order_fulfillment_items_fulfillment_fk" FOREIGN KEY ("fulfillment_id","vendor_order_id") REFERENCES "public"."order_fulfillments"("id","vendor_order_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_fulfillment_items" ADD CONSTRAINT "order_fulfillment_items_order_item_fk" FOREIGN KEY ("order_item_id","vendor_order_id") REFERENCES "public"."order_items"("id","vendor_order_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_fulfillments" ADD CONSTRAINT "order_fulfillments_vendor_order_id_vendor_orders_id_fk" FOREIGN KEY ("vendor_order_id") REFERENCES "public"."vendor_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_fulfillments" ADD CONSTRAINT "order_fulfillments_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variant_id_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."variants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_vendor_order_consistency_fk" FOREIGN KEY ("vendor_order_id","order_id","vendor_id") REFERENCES "public"."vendor_orders"("id","order_id","vendor_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_cart_id_carts_id_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."carts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_order_addresses" ADD CONSTRAINT "vendor_order_addresses_vendor_order_id_vendor_orders_id_fk" FOREIGN KEY ("vendor_order_id") REFERENCES "public"."vendor_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_orders" ADD CONSTRAINT "vendor_orders_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_orders" ADD CONSTRAINT "vendor_orders_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_order_financials" ADD CONSTRAINT "vendor_order_financials_vendor_order_id_vendor_orders_id_fk" FOREIGN KEY ("vendor_order_id") REFERENCES "public"."vendor_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_order_financials" ADD CONSTRAINT "vendor_order_financials_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_payout_items" ADD CONSTRAINT "vendor_payout_items_payout_id_vendor_payouts_id_fk" FOREIGN KEY ("payout_id") REFERENCES "public"."vendor_payouts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_payout_items" ADD CONSTRAINT "vendor_payout_items_vendor_order_id_vendor_orders_id_fk" FOREIGN KEY ("vendor_order_id") REFERENCES "public"."vendor_orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_payout_items" ADD CONSTRAINT "vendor_payout_items_vendor_order_financial_id_vendor_order_financials_id_fk" FOREIGN KEY ("vendor_order_financial_id") REFERENCES "public"."vendor_order_financials"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_payouts" ADD CONSTRAINT "vendor_payouts_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_adjustments" ADD CONSTRAINT "inventory_adjustments_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_adjustments" ADD CONSTRAINT "inventory_adjustments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_variant_vendor_fk" FOREIGN KEY ("variant_id","vendor_id") REFERENCES "public"."variants"("id","vendor_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_media" ADD CONSTRAINT "product_media_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_media" ADD CONSTRAINT "product_media_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_option_values" ADD CONSTRAINT "product_option_values_option_id_product_options_id_fk" FOREIGN KEY ("option_id") REFERENCES "public"."product_options"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_option_values" ADD CONSTRAINT "product_option_values_swatch_file_id_files_id_fk" FOREIGN KEY ("swatch_file_id") REFERENCES "public"."files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_options" ADD CONSTRAINT "product_options_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_tags" ADD CONSTRAINT "product_tags_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_featured_file_id_files_id_fk" FOREIGN KEY ("featured_file_id") REFERENCES "public"."files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variant_images" ADD CONSTRAINT "variant_images_variant_id_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variant_media" ADD CONSTRAINT "variant_media_variant_id_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variant_media" ADD CONSTRAINT "variant_media_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variant_selected_options" ADD CONSTRAINT "variant_selected_options_variant_id_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variant_selected_options" ADD CONSTRAINT "variant_selected_options_option_fk" FOREIGN KEY ("option_id") REFERENCES "public"."product_options"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variant_selected_options" ADD CONSTRAINT "variant_selected_options_option_value_fk" FOREIGN KEY ("option_value_id","option_id") REFERENCES "public"."product_option_values"("id","option_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variants" ADD CONSTRAINT "variants_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variants" ADD CONSTRAINT "variants_featured_file_id_files_id_fk" FOREIGN KEY ("featured_file_id") REFERENCES "public"."files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variants" ADD CONSTRAINT "variants_product_vendor_fk" FOREIGN KEY ("product_id","vendor_id") REFERENCES "public"."products"("id","vendor_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_config_option_values" ADD CONSTRAINT "product_config_option_values_option_id_product_config_options_id_fk" FOREIGN KEY ("option_id") REFERENCES "public"."product_config_options"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_config_options" ADD CONSTRAINT "product_config_options_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refund_items" ADD CONSTRAINT "refund_items_refund_id_refunds_id_fk" FOREIGN KEY ("refund_id") REFERENCES "public"."refunds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refund_items" ADD CONSTRAINT "refund_items_order_item_id_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_vendor_order_id_vendor_orders_id_fk" FOREIGN KEY ("vendor_order_id") REFERENCES "public"."vendor_orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "return_items" ADD CONSTRAINT "return_items_return_id_returns_id_fk" FOREIGN KEY ("return_id") REFERENCES "public"."returns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "return_items" ADD CONSTRAINT "return_items_order_item_id_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "returns" ADD CONSTRAINT "returns_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "returns" ADD CONSTRAINT "returns_vendor_order_id_vendor_orders_id_fk" FOREIGN KEY ("vendor_order_id") REFERENCES "public"."vendor_orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "returns" ADD CONSTRAINT "returns_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "returns" ADD CONSTRAINT "returns_processed_by_users_id_fk" FOREIGN KEY ("processed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_review_media" ADD CONSTRAINT "product_review_media_review_id_product_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."product_reviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_review_media" ADD CONSTRAINT "product_review_media_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_variant_id_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."variants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_order_item_id_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_moderated_by_users_id_fk" FOREIGN KEY ("moderated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_notify_subscriptions" ADD CONSTRAINT "stock_notify_subscriptions_variant_id_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_notify_subscriptions" ADD CONSTRAINT "stock_notify_subscriptions_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipping_rates" ADD CONSTRAINT "shipping_rates_zone_id_shipping_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."shipping_zones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_variant_id_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."variants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_rates" ADD CONSTRAINT "tax_rates_zone_id_tax_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."tax_zones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_2fa" ADD CONSTRAINT "user_2fa_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_addresses" ADD CONSTRAINT "vendor_addresses_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_kyc_documents" ADD CONSTRAINT "vendor_kyc_documents_vendor_kyc_id_vendor_kycs_id_fk" FOREIGN KEY ("vendor_kyc_id") REFERENCES "public"."vendor_kycs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_kyc_documents" ADD CONSTRAINT "vendor_kyc_documents_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_kycs" ADD CONSTRAINT "vendor_kycs_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_kycs" ADD CONSTRAINT "vendor_kycs_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_memberships" ADD CONSTRAINT "vendor_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_memberships" ADD CONSTRAINT "vendor_memberships_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_memberships" ADD CONSTRAINT "vendor_memberships_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_memberships" ADD CONSTRAINT "vendor_memberships_revoked_by_users_id_fk" FOREIGN KEY ("revoked_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_event_id_webhook_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."webhook_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_endpoint_id_webhook_endpoints_id_fk" FOREIGN KEY ("endpoint_id") REFERENCES "public"."webhook_endpoints"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "newsletter_campaigns" ADD CONSTRAINT "newsletter_campaigns_segment_id_customer_segments_id_fk" FOREIGN KEY ("segment_id") REFERENCES "public"."customer_segments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "newsletter_campaigns" ADD CONSTRAINT "newsletter_campaigns_sent_by_user_id_users_id_fk" FOREIGN KEY ("sent_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "api_keys_key_hash_idx" ON "api_keys" USING btree ("key_hash");--> statement-breakpoint
CREATE INDEX "api_keys_vendor_id_idx" ON "api_keys" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "api_keys_status_idx" ON "api_keys" USING btree ("status");--> statement-breakpoint
CREATE INDEX "audit_logs_actor_user_id_idx" ON "audit_logs" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_logs_action_idx" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_ip_address_idx" ON "audit_logs" USING btree ("ip_address");--> statement-breakpoint
CREATE INDEX "campaign_events_campaign_id_idx" ON "campaign_events" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "campaign_events_type_idx" ON "campaign_events" USING btree ("type");--> statement-breakpoint
CREATE INDEX "campaign_events_campaign_type_created_idx" ON "campaign_events" USING btree ("campaign_id","type","created_at");--> statement-breakpoint
CREATE INDEX "campaign_events_order_id_idx" ON "campaign_events" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "campaigns_status_idx" ON "campaigns" USING btree ("status");--> statement-breakpoint
CREATE INDEX "campaigns_active_window_idx" ON "campaigns" USING btree ("status","starts_at","ends_at");--> statement-breakpoint
CREATE INDEX "campaigns_priority_idx" ON "campaigns" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "cart_item_discount_allocations_cart_item_id_idx" ON "cart_item_discount_allocations" USING btree ("cart_item_id");--> statement-breakpoint
CREATE INDEX "cart_items_cart_id_idx" ON "cart_items" USING btree ("cart_id");--> statement-breakpoint
CREATE INDEX "cart_items_vendor_id_idx" ON "cart_items" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "cart_items_variant_id_idx" ON "cart_items" USING btree ("variant_id");--> statement-breakpoint
CREATE INDEX "carts_customer_id_idx" ON "carts" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "carts_session_id_idx" ON "carts" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "carts_status_idx" ON "carts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "carts_updated_at_idx" ON "carts" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "collection_products_collection_id_idx" ON "collection_products" USING btree ("collection_id");--> statement-breakpoint
CREATE INDEX "collection_products_product_id_idx" ON "collection_products" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "collection_products_collection_position_idx" ON "collection_products" USING btree ("collection_id","position");--> statement-breakpoint
CREATE INDEX "collection_rules_collection_id_idx" ON "collection_rules" USING btree ("collection_id");--> statement-breakpoint
CREATE INDEX "collection_rules_collection_position_idx" ON "collection_rules" USING btree ("collection_id","position");--> statement-breakpoint
CREATE INDEX "collections_vendor_status_idx" ON "collections" USING btree ("vendor_id","status");--> statement-breakpoint
CREATE INDEX "collections_vendor_type_idx" ON "collections" USING btree ("vendor_id","type");--> statement-breakpoint
CREATE INDEX "collections_vendor_published_at_idx" ON "collections" USING btree ("vendor_id","published_at");--> statement-breakpoint
CREATE INDEX "collections_image_file_id_idx" ON "collections" USING btree ("image_file_id");--> statement-breakpoint
CREATE INDEX "collections_deleted_at_idx" ON "collections" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "commission_rules_scope_idx" ON "commission_rules" USING btree ("scope");--> statement-breakpoint
CREATE INDEX "commission_rules_vendor_id_idx" ON "commission_rules" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "commission_rules_status_idx" ON "commission_rules" USING btree ("status");--> statement-breakpoint
CREATE INDEX "commission_rules_starts_at_idx" ON "commission_rules" USING btree ("starts_at");--> statement-breakpoint
CREATE INDEX "commission_rules_ends_at_idx" ON "commission_rules" USING btree ("ends_at");--> statement-breakpoint
CREATE INDEX "blog_post_tags_blog_post_id_idx" ON "blog_post_tags" USING btree ("blog_post_id");--> statement-breakpoint
CREATE INDEX "blog_post_tags_tag_id_idx" ON "blog_post_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "blog_posts_blog_id_idx" ON "blog_posts" USING btree ("blog_id");--> statement-breakpoint
CREATE INDEX "blog_posts_author_id_idx" ON "blog_posts" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "blog_posts_status_idx" ON "blog_posts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "blog_posts_published_at_idx" ON "blog_posts" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "blog_posts_featured_image_file_id_idx" ON "blog_posts" USING btree ("featured_image_file_id");--> statement-breakpoint
CREATE INDEX "blog_posts_deleted_at_idx" ON "blog_posts" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "blog_tags_deleted_at_idx" ON "blog_tags" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "blogs_status_idx" ON "blogs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "blogs_published_at_idx" ON "blogs" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "blogs_deleted_at_idx" ON "blogs" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "pages_status_idx" ON "pages" USING btree ("status");--> statement-breakpoint
CREATE INDEX "pages_published_at_idx" ON "pages" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "pages_deleted_at_idx" ON "pages" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "currencies_is_active_idx" ON "currencies" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "customer_addresses_customer_id_idx" ON "customer_addresses" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "customer_addresses_country_code_idx" ON "customer_addresses" USING btree ("country_code");--> statement-breakpoint
CREATE INDEX "customer_addresses_deleted_at_idx" ON "customer_addresses" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "customer_segment_members_segment_idx" ON "customer_segment_members" USING btree ("segment_id");--> statement-breakpoint
CREATE INDEX "customer_segment_members_customer_idx" ON "customer_segment_members" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "customer_segments_status_idx" ON "customer_segments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "customer_segments_type_idx" ON "customer_segments" USING btree ("type");--> statement-breakpoint
CREATE INDEX "customer_segments_deleted_at_idx" ON "customer_segments" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "customer_tags_customer_id_idx" ON "customer_tags" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "customer_tags_tag_idx" ON "customer_tags" USING btree ("tag");--> statement-breakpoint
CREATE INDEX "customers_state_idx" ON "customers" USING btree ("state");--> statement-breakpoint
CREATE INDEX "customers_last_order_at_idx" ON "customers" USING btree ("last_order_at");--> statement-breakpoint
CREATE INDEX "customers_rfm_segment_key_idx" ON "customers" USING btree ("rfm_segment_key");--> statement-breakpoint
CREATE INDEX "customers_is_guest_idx" ON "customers" USING btree ("is_guest");--> statement-breakpoint
CREATE INDEX "customers_deleted_at_idx" ON "customers" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "customers_first_name_idx" ON "customers" USING btree ("first_name");--> statement-breakpoint
CREATE INDEX "customers_last_name_idx" ON "customers" USING btree ("last_name");--> statement-breakpoint
CREATE INDEX "cart_applied_discounts_cart_id_idx" ON "cart_applied_discounts" USING btree ("cart_id");--> statement-breakpoint
CREATE INDEX "discount_codes_discount_id_idx" ON "discount_codes" USING btree ("discount_id");--> statement-breakpoint
CREATE INDEX "discount_codes_status_idx" ON "discount_codes" USING btree ("status");--> statement-breakpoint
CREATE INDEX "discount_collections_discount_id_idx" ON "discount_collections" USING btree ("discount_id");--> statement-breakpoint
CREATE INDEX "discount_collections_collection_id_idx" ON "discount_collections" USING btree ("collection_id");--> statement-breakpoint
CREATE INDEX "discount_products_discount_id_idx" ON "discount_products" USING btree ("discount_id");--> statement-breakpoint
CREATE INDEX "discount_products_product_id_idx" ON "discount_products" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "discount_redemptions_discount_id_idx" ON "discount_redemptions" USING btree ("discount_id");--> statement-breakpoint
CREATE INDEX "discount_redemptions_cart_id_idx" ON "discount_redemptions" USING btree ("cart_id");--> statement-breakpoint
CREATE INDEX "discount_redemptions_order_id_idx" ON "discount_redemptions" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "discount_redemptions_customer_id_idx" ON "discount_redemptions" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "discount_redemptions_status_idx" ON "discount_redemptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "discount_vendor_targets_vendor_id_idx" ON "discount_vendor_targets" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "discounts_scope_status_idx" ON "discounts" USING btree ("scope","status");--> statement-breakpoint
CREATE INDEX "discounts_vendor_id_idx" ON "discounts" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "discounts_starts_at_idx" ON "discounts" USING btree ("starts_at");--> statement-breakpoint
CREATE INDEX "discounts_ends_at_idx" ON "discounts" USING btree ("ends_at");--> statement-breakpoint
CREATE INDEX "discounts_active_auto_idx" ON "discounts" USING btree ("method","status","starts_at","ends_at");--> statement-breakpoint
CREATE INDEX "discounts_campaign_id_idx" ON "discounts" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "order_applied_discounts_order_id_idx" ON "order_applied_discounts" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "vendor_order_applied_discounts_vendor_order_id_idx" ON "vendor_order_applied_discounts" USING btree ("vendor_order_id");--> statement-breakpoint
CREATE INDEX "facet_filters_vendor_position_idx" ON "facet_filters" USING btree ("vendor_id","position");--> statement-breakpoint
CREATE INDEX "facet_filters_enabled_idx" ON "facet_filters" USING btree ("enabled");--> statement-breakpoint
CREATE INDEX "facet_filters_deleted_at_idx" ON "facet_filters" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "files_scope_idx" ON "files" USING btree ("scope");--> statement-breakpoint
CREATE INDEX "files_vendor_id_idx" ON "files" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "files_kind_idx" ON "files" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "files_status_idx" ON "files" USING btree ("status");--> statement-breakpoint
CREATE INDEX "files_uploaded_by_idx" ON "files" USING btree ("uploaded_by");--> statement-breakpoint
CREATE INDEX "files_deleted_at_idx" ON "files" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "gift_card_transactions_gift_card_id_idx" ON "gift_card_transactions" USING btree ("gift_card_id");--> statement-breakpoint
CREATE INDEX "gift_card_transactions_order_id_idx" ON "gift_card_transactions" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "gift_card_transactions_type_idx" ON "gift_card_transactions" USING btree ("type");--> statement-breakpoint
CREATE INDEX "gift_cards_status_idx" ON "gift_cards" USING btree ("status");--> statement-breakpoint
CREATE INDEX "gift_cards_customer_id_idx" ON "gift_cards" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "gift_cards_issued_by_user_id_idx" ON "gift_cards" USING btree ("issued_by_user_id");--> statement-breakpoint
CREATE INDEX "loyalty_ledger_customer_idx" ON "loyalty_ledger" USING btree ("customer_id","created_at");--> statement-breakpoint
CREATE INDEX "loyalty_ledger_order_idx" ON "loyalty_ledger" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "message_threads_customer_idx" ON "message_threads" USING btree ("customer_id","last_message_at");--> statement-breakpoint
CREATE INDEX "message_threads_vendor_idx" ON "message_threads" USING btree ("vendor_id","last_message_at");--> statement-breakpoint
CREATE INDEX "message_threads_product_idx" ON "message_threads" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "message_threads_order_idx" ON "message_threads" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "messages_thread_idx" ON "messages" USING btree ("thread_id","created_at");--> statement-breakpoint
CREATE INDEX "inventory_reservations_inventory_item_id_idx" ON "inventory_reservations" USING btree ("inventory_item_id");--> statement-breakpoint
CREATE INDEX "inventory_reservations_cart_id_idx" ON "inventory_reservations" USING btree ("cart_id");--> statement-breakpoint
CREATE INDEX "inventory_reservations_order_id_idx" ON "inventory_reservations" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "inventory_reservations_status_idx" ON "inventory_reservations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "inventory_reservations_expires_at_idx" ON "inventory_reservations" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "collection_metafields_vendor_id_idx" ON "collection_metafields" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "collection_metafields_collection_id_idx" ON "collection_metafields" USING btree ("collection_id");--> statement-breakpoint
CREATE INDEX "customer_metafields_customer_id_idx" ON "customer_metafields" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "page_metafields_page_id_idx" ON "page_metafields" USING btree ("page_id");--> statement-breakpoint
CREATE INDEX "product_metafields_vendor_id_idx" ON "product_metafields" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "product_metafields_product_id_idx" ON "product_metafields" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "variant_metafields_vendor_id_idx" ON "variant_metafields" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "variant_metafields_variant_id_idx" ON "variant_metafields" USING btree ("variant_id");--> statement-breakpoint
CREATE INDEX "notifications_user_id_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notifications_customer_id_idx" ON "notifications" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "notifications_vendor_id_idx" ON "notifications" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "notifications_status_idx" ON "notifications" USING btree ("status");--> statement-breakpoint
CREATE INDEX "notifications_channel_idx" ON "notifications" USING btree ("channel");--> statement-breakpoint
CREATE INDEX "notifications_type_idx" ON "notifications" USING btree ("type");--> statement-breakpoint
CREATE INDEX "notifications_created_at_idx" ON "notifications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "notification_preferences_user_id_idx" ON "notification_preferences" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notification_preferences_customer_id_idx" ON "notification_preferences" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "order_addresses_order_id_idx" ON "order_addresses" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_fulfillment_items_vendor_order_id_idx" ON "order_fulfillment_items" USING btree ("vendor_order_id");--> statement-breakpoint
CREATE INDEX "order_fulfillment_items_order_item_id_idx" ON "order_fulfillment_items" USING btree ("order_item_id");--> statement-breakpoint
CREATE INDEX "order_fulfillments_vendor_order_id_idx" ON "order_fulfillments" USING btree ("vendor_order_id");--> statement-breakpoint
CREATE INDEX "order_fulfillments_vendor_id_idx" ON "order_fulfillments" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "order_fulfillments_status_idx" ON "order_fulfillments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "order_items_order_id_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_items_vendor_order_id_idx" ON "order_items" USING btree ("vendor_order_id");--> statement-breakpoint
CREATE INDEX "order_items_vendor_id_idx" ON "order_items" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "order_items_product_id_idx" ON "order_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "order_items_variant_id_idx" ON "order_items" USING btree ("variant_id");--> statement-breakpoint
CREATE INDEX "order_items_status_idx" ON "order_items" USING btree ("status");--> statement-breakpoint
CREATE INDEX "orders_customer_id_idx" ON "orders" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "orders_cart_id_idx" ON "orders" USING btree ("cart_id");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "orders_payment_status_idx" ON "orders" USING btree ("payment_status");--> statement-breakpoint
CREATE INDEX "orders_fulfillment_status_idx" ON "orders" USING btree ("fulfillment_status");--> statement-breakpoint
CREATE INDEX "orders_delivery_status_idx" ON "orders" USING btree ("delivery_status");--> statement-breakpoint
CREATE INDEX "orders_placed_at_idx" ON "orders" USING btree ("placed_at");--> statement-breakpoint
CREATE INDEX "orders_customer_email_idx" ON "orders" USING btree ("customer_email");--> statement-breakpoint
CREATE INDEX "vendor_order_addresses_vendor_order_id_idx" ON "vendor_order_addresses" USING btree ("vendor_order_id");--> statement-breakpoint
CREATE INDEX "vendor_orders_order_id_idx" ON "vendor_orders" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "vendor_orders_vendor_id_idx" ON "vendor_orders" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "vendor_orders_status_idx" ON "vendor_orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "vendor_orders_payment_status_idx" ON "vendor_orders" USING btree ("payment_status");--> statement-breakpoint
CREATE INDEX "vendor_orders_fulfillment_status_idx" ON "vendor_orders" USING btree ("fulfillment_status");--> statement-breakpoint
CREATE INDEX "vendor_orders_delivery_status_idx" ON "vendor_orders" USING btree ("delivery_status");--> statement-breakpoint
CREATE INDEX "payment_transactions_payment_id_idx" ON "payment_transactions" USING btree ("payment_id");--> statement-breakpoint
CREATE INDEX "payment_transactions_type_idx" ON "payment_transactions" USING btree ("type");--> statement-breakpoint
CREATE INDEX "payment_transactions_status_idx" ON "payment_transactions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "payments_order_id_idx" ON "payments" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "payments_customer_id_idx" ON "payments" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "payments_provider_idx" ON "payments" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "payments_status_idx" ON "payments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "vendor_order_financials_vendor_id_idx" ON "vendor_order_financials" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "vendor_payout_items_payout_id_idx" ON "vendor_payout_items" USING btree ("payout_id");--> statement-breakpoint
CREATE INDEX "vendor_payout_items_financial_id_idx" ON "vendor_payout_items" USING btree ("vendor_order_financial_id");--> statement-breakpoint
CREATE INDEX "vendor_payouts_vendor_id_idx" ON "vendor_payouts" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "vendor_payouts_status_idx" ON "vendor_payouts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "inventory_adjustments_inventory_item_id_idx" ON "inventory_adjustments" USING btree ("inventory_item_id");--> statement-breakpoint
CREATE INDEX "inventory_adjustments_reason_idx" ON "inventory_adjustments" USING btree ("reason");--> statement-breakpoint
CREATE INDEX "inventory_adjustments_reference_idx" ON "inventory_adjustments" USING btree ("reference_type","reference_id");--> statement-breakpoint
CREATE INDEX "inventory_adjustments_created_by_idx" ON "inventory_adjustments" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "inventory_items_vendor_id_idx" ON "inventory_items" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "inventory_items_available_quantity_idx" ON "inventory_items" USING btree ("available_quantity");--> statement-breakpoint
CREATE INDEX "product_images_product_id_idx" ON "product_images" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "product_media_product_id_idx" ON "product_media" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "product_media_file_id_idx" ON "product_media" USING btree ("file_id");--> statement-breakpoint
CREATE INDEX "product_option_values_option_id_idx" ON "product_option_values" USING btree ("option_id");--> statement-breakpoint
CREATE INDEX "product_option_values_swatch_file_id_idx" ON "product_option_values" USING btree ("swatch_file_id");--> statement-breakpoint
CREATE INDEX "product_options_product_id_idx" ON "product_options" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "product_tags_product_id_idx" ON "product_tags" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "product_tags_tag_idx" ON "product_tags" USING btree ("tag");--> statement-breakpoint
CREATE INDEX "products_vendor_status_idx" ON "products" USING btree ("vendor_id","status");--> statement-breakpoint
CREATE INDEX "products_vendor_product_type_idx" ON "products" USING btree ("vendor_id","product_type");--> statement-breakpoint
CREATE INDEX "products_vendor_brand_idx" ON "products" USING btree ("vendor_id","brand");--> statement-breakpoint
CREATE INDEX "products_vendor_published_at_idx" ON "products" USING btree ("vendor_id","published_at");--> statement-breakpoint
CREATE INDEX "products_featured_file_id_idx" ON "products" USING btree ("featured_file_id");--> statement-breakpoint
CREATE INDEX "products_deleted_at_idx" ON "products" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "variant_images_variant_id_idx" ON "variant_images" USING btree ("variant_id");--> statement-breakpoint
CREATE INDEX "variant_media_variant_id_idx" ON "variant_media" USING btree ("variant_id");--> statement-breakpoint
CREATE INDEX "variant_media_file_id_idx" ON "variant_media" USING btree ("file_id");--> statement-breakpoint
CREATE INDEX "variant_selected_options_variant_id_idx" ON "variant_selected_options" USING btree ("variant_id");--> statement-breakpoint
CREATE INDEX "variant_selected_options_option_id_idx" ON "variant_selected_options" USING btree ("option_id");--> statement-breakpoint
CREATE INDEX "variant_selected_options_option_value_id_idx" ON "variant_selected_options" USING btree ("option_value_id");--> statement-breakpoint
CREATE INDEX "variants_product_id_idx" ON "variants" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "variants_vendor_status_idx" ON "variants" USING btree ("vendor_id","status");--> statement-breakpoint
CREATE INDEX "variants_vendor_barcode_idx" ON "variants" USING btree ("vendor_id","barcode");--> statement-breakpoint
CREATE INDEX "variants_featured_file_id_idx" ON "variants" USING btree ("featured_file_id");--> statement-breakpoint
CREATE INDEX "variants_deleted_at_idx" ON "variants" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "product_config_option_values_option_idx" ON "product_config_option_values" USING btree ("option_id","position");--> statement-breakpoint
CREATE INDEX "product_config_options_product_idx" ON "product_config_options" USING btree ("product_id","position");--> statement-breakpoint
CREATE INDEX "refund_items_refund_id_idx" ON "refund_items" USING btree ("refund_id");--> statement-breakpoint
CREATE INDEX "refund_items_order_item_id_idx" ON "refund_items" USING btree ("order_item_id");--> statement-breakpoint
CREATE INDEX "refunds_order_id_idx" ON "refunds" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "refunds_vendor_order_id_idx" ON "refunds" USING btree ("vendor_order_id");--> statement-breakpoint
CREATE INDEX "refunds_payment_id_idx" ON "refunds" USING btree ("payment_id");--> statement-breakpoint
CREATE INDEX "refunds_status_idx" ON "refunds" USING btree ("status");--> statement-breakpoint
CREATE INDEX "refunds_provider_refund_id_idx" ON "refunds" USING btree ("provider_refund_id");--> statement-breakpoint
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "refresh_tokens_customer_id_idx" ON "refresh_tokens" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "refresh_tokens_token_hash_idx" ON "refresh_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "refresh_tokens_expires_at_idx" ON "refresh_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "return_items_return_id_idx" ON "return_items" USING btree ("return_id");--> statement-breakpoint
CREATE INDEX "return_items_order_item_id_idx" ON "return_items" USING btree ("order_item_id");--> statement-breakpoint
CREATE INDEX "returns_order_id_idx" ON "returns" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "returns_vendor_order_id_idx" ON "returns" USING btree ("vendor_order_id");--> statement-breakpoint
CREATE INDEX "returns_customer_id_idx" ON "returns" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "returns_status_idx" ON "returns" USING btree ("status");--> statement-breakpoint
CREATE INDEX "returns_processed_by_idx" ON "returns" USING btree ("processed_by");--> statement-breakpoint
CREATE INDEX "product_review_media_review_id_idx" ON "product_review_media" USING btree ("review_id");--> statement-breakpoint
CREATE INDEX "product_review_media_file_id_idx" ON "product_review_media" USING btree ("file_id");--> statement-breakpoint
CREATE INDEX "product_reviews_vendor_product_status_idx" ON "product_reviews" USING btree ("vendor_id","product_id","status");--> statement-breakpoint
CREATE INDEX "product_reviews_variant_id_idx" ON "product_reviews" USING btree ("variant_id");--> statement-breakpoint
CREATE INDEX "product_reviews_customer_id_idx" ON "product_reviews" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "product_reviews_status_rating_idx" ON "product_reviews" USING btree ("status","rating");--> statement-breakpoint
CREATE INDEX "product_reviews_published_at_idx" ON "product_reviews" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "product_reviews_moderated_by_idx" ON "product_reviews" USING btree ("moderated_by");--> statement-breakpoint
CREATE INDEX "stock_notify_variant_pending_idx" ON "stock_notify_subscriptions" USING btree ("variant_id") WHERE "stock_notify_subscriptions"."notified_at" IS NULL;--> statement-breakpoint
CREATE INDEX "subscriptions_customer_id_idx" ON "subscriptions" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "subscriptions_vendor_id_idx" ON "subscriptions" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "subscriptions_status_idx" ON "subscriptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "subscriptions_next_billing_at_idx" ON "subscriptions" USING btree ("next_billing_at");--> statement-breakpoint
CREATE INDEX "users_platform_role_idx" ON "users" USING btree ("platform_role");--> statement-breakpoint
CREATE INDEX "users_is_active_idx" ON "users" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "users_deleted_at_idx" ON "users" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "user_2fa_user_id_idx" ON "user_2fa" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "vendor_addresses_vendor_id_idx" ON "vendor_addresses" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "vendor_addresses_vendor_type_idx" ON "vendor_addresses" USING btree ("vendor_id","type");--> statement-breakpoint
CREATE INDEX "vendor_addresses_country_code_idx" ON "vendor_addresses" USING btree ("country_code");--> statement-breakpoint
CREATE INDEX "vendor_addresses_deleted_at_idx" ON "vendor_addresses" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "vendor_kyc_documents_vendor_kyc_id_idx" ON "vendor_kyc_documents" USING btree ("vendor_kyc_id");--> statement-breakpoint
CREATE INDEX "vendor_kyc_documents_document_type_idx" ON "vendor_kyc_documents" USING btree ("document_type");--> statement-breakpoint
CREATE INDEX "vendor_kyc_documents_file_id_idx" ON "vendor_kyc_documents" USING btree ("file_id");--> statement-breakpoint
CREATE INDEX "vendor_kycs_vendor_id_idx" ON "vendor_kycs" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "vendor_kycs_status_idx" ON "vendor_kycs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "vendor_memberships_user_idx" ON "vendor_memberships" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "vendor_memberships_vendor_idx" ON "vendor_memberships" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "vendor_memberships_vendor_status_idx" ON "vendor_memberships" USING btree ("vendor_id","status");--> statement-breakpoint
CREATE INDEX "vendor_memberships_user_status_idx" ON "vendor_memberships" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "vendors_status_idx" ON "vendors" USING btree ("status");--> statement-breakpoint
CREATE INDEX "vendors_country_code_idx" ON "vendors" USING btree ("country_code");--> statement-breakpoint
CREATE INDEX "vendors_created_by_idx" ON "vendors" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "vendors_deleted_at_idx" ON "vendors" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "vendors_primary_email_idx" ON "vendors" USING btree ("primary_email");--> statement-breakpoint
CREATE INDEX "webhook_deliveries_endpoint_id_idx" ON "webhook_deliveries" USING btree ("endpoint_id");--> statement-breakpoint
CREATE INDEX "webhook_deliveries_status_idx" ON "webhook_deliveries" USING btree ("status");--> statement-breakpoint
CREATE INDEX "webhook_deliveries_next_retry_at_idx" ON "webhook_deliveries" USING btree ("next_retry_at");--> statement-breakpoint
CREATE INDEX "webhook_endpoints_status_idx" ON "webhook_endpoints" USING btree ("status");--> statement-breakpoint
CREATE INDEX "webhook_endpoints_deleted_at_idx" ON "webhook_endpoints" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "webhook_events_event_type_idx" ON "webhook_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "webhook_events_entity_idx" ON "webhook_events" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "webhook_events_status_idx" ON "webhook_events" USING btree ("status");--> statement-breakpoint
CREATE INDEX "webhook_events_created_at_idx" ON "webhook_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "wishlist_items_customer_id_idx" ON "wishlist_items" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "wishlist_items_product_id_idx" ON "wishlist_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "newsletter_campaigns_sent_at_idx" ON "newsletter_campaigns" USING btree ("sent_at");