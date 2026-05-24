/**
 * Shared types for the facet-filter module.
 *
 * A facet filter is an admin-managed definition of a storefront filter — its
 * URL key, label, source (option / metafield / collection / …), render type
 * (checkbox / slider / …), order, and on/off state.
 */
export type FacetSourceType =
  | "variant_price"
  | "variant_option"
  | "variant_metafield"
  | "product_metafield"
  | "collection"
  | "tag"
  | "vendor"
  | "rating"
  | "availability";

export type FacetDisplayType =
  | "checkbox"
  | "radio"
  | "slider"
  | "swatch"
  | "toggle";

export interface CreateFacetFilterDto {
  key: string;
  label: string;
  sourceType: FacetSourceType;
  sourceRef?: string | null;
  displayType: FacetDisplayType;
  config?: Record<string, unknown> | null;
  position?: number;
  enabled?: boolean;
}

export interface UpdateFacetFilterDto {
  key?: string;
  label?: string;
  sourceType?: FacetSourceType;
  sourceRef?: string | null;
  displayType?: FacetDisplayType;
  config?: Record<string, unknown> | null;
  position?: number;
  enabled?: boolean;
}

/** A single populated facet option on the storefront. */
export interface StorefrontFacetOption {
  value: string;
  label: string;
  count?: number;
  /** Optional metadata — e.g. `{ hex: "#ff0000" }` for a swatch. */
  meta?: Record<string, unknown>;
}

export interface StorefrontFacet {
  key: string;
  label: string;
  sourceType: FacetSourceType;
  displayType: FacetDisplayType;
  config?: Record<string, unknown> | null;
  options: StorefrontFacetOption[];
  /** Numeric bounds for slider-typed facets. */
  range?: { min: number; max: number } | null;
}
