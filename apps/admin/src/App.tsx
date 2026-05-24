import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
import { initObservability } from "@/lib/observability";
import { AuthProvider } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Toaster } from "@/components/Toaster";
import { ConfirmDialogHost } from "@/components/ui/confirm-dialog";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PageSkeleton } from "@/components/PageSkeleton";
import { AdminLayout } from "@/components/AdminLayout";
import { VendorLayout } from "@/components/VendorLayout";

// ── Lazy-loaded pages ────────────────────────────────────────────────────────

// Auth
const AdminLoginPage = lazy(() => import("@/pages/AdminLoginPage").then((m) => ({ default: m.AdminLoginPage })));
const AdminForgotPasswordPage = lazy(() => import("@/pages/AdminForgotPasswordPage").then((m) => ({ default: m.AdminForgotPasswordPage })));
const AdminResetPasswordPage = lazy(() => import("@/pages/AdminResetPasswordPage").then((m) => ({ default: m.AdminResetPasswordPage })));
const VendorLoginPage = lazy(() => import("@/pages/VendorLoginPage").then((m) => ({ default: m.VendorLoginPage })));

// Dashboard
const DashboardPage = lazy(() => import("@/pages/DashboardPage").then((m) => ({ default: m.DashboardPage })));

// Vendor portal
const VendorDashboardPage = lazy(() => import("@/pages/vendor/VendorDashboardPage").then((m) => ({ default: m.VendorDashboardPage })));
const VendorAnalyticsPage = lazy(() => import("@/pages/vendor/VendorAnalyticsPage").then((m) => ({ default: m.VendorAnalyticsPage })));
const VendorProductsPage = lazy(() => import("@/pages/vendor/VendorProductsPage").then((m) => ({ default: m.VendorProductsPage })));
const VendorProductFormPage = lazy(() => import("@/pages/vendor/VendorProductFormPage").then((m) => ({ default: m.VendorProductFormPage })));
const VendorOrdersPage = lazy(() => import("@/pages/vendor/VendorOrdersPage").then((m) => ({ default: m.VendorOrdersPage })));
const VendorOrderDetailPage = lazy(() => import("@/pages/vendor/VendorOrderDetailPage").then((m) => ({ default: m.VendorOrderDetailPage })));
const VendorReviewsPage = lazy(() => import("@/pages/vendor/VendorReviewsPage").then((m) => ({ default: m.VendorReviewsPage })));
const VendorMessagesPage = lazy(() => import("@/pages/vendor/VendorMessagesPage").then((m) => ({ default: m.VendorMessagesPage })));
const VendorMessageThreadPage = lazy(() => import("@/pages/vendor/VendorMessagesPage").then((m) => ({ default: m.VendorMessageThreadPage })));

// Vendors
const VendorListPage = lazy(() => import("@/pages/vendors/VendorListPage").then((m) => ({ default: m.VendorListPage })));
const VendorDetailPage = lazy(() => import("@/pages/vendors/VendorDetailPage").then((m) => ({ default: m.VendorDetailPage })));
const VendorFormPage = lazy(() => import("@/pages/vendors/VendorFormPage").then((m) => ({ default: m.VendorFormPage })));
const VendorApprovalsPage = lazy(() => import("@/pages/vendors/VendorApprovalsPage").then((m) => ({ default: m.VendorApprovalsPage })));
const VendorKycPage = lazy(() => import("@/pages/vendors/VendorKycPage").then((m) => ({ default: m.VendorKycPage })));
const VendorMembershipsPage = lazy(() => import("@/pages/vendors/VendorMembershipsPage").then((m) => ({ default: m.VendorMembershipsPage })));

// Customers
const CustomerListPage = lazy(() => import("@/pages/customers/CustomerListPage").then((m) => ({ default: m.CustomerListPage })));
const CustomerDetailPage = lazy(() => import("@/pages/customers/CustomerDetailPage").then((m) => ({ default: m.CustomerDetailPage })));
const CustomerFormPage = lazy(() => import("@/pages/customers/CustomerFormPage").then((m) => ({ default: m.CustomerFormPage })));
const CustomerSegmentsPage = lazy(() => import("@/pages/customers/CustomerSegmentsPage").then((m) => ({ default: m.CustomerSegmentsPage })));
const CustomerSegmentDetailPage = lazy(() => import("@/pages/customers/CustomerSegmentDetailPage").then((m) => ({ default: m.CustomerSegmentDetailPage })));

// Catalog
const ProductListPage = lazy(() => import("@/pages/catalog/ProductListPage").then((m) => ({ default: m.ProductListPage })));
const ProductDetailPage = lazy(() => import("@/pages/catalog/ProductDetailPage").then((m) => ({ default: m.ProductDetailPage })));
const ProductFormPage = lazy(() => import("@/pages/catalog/ProductFormPage").then((m) => ({ default: m.ProductFormPage })));
const CollectionListPage = lazy(() => import("@/pages/catalog/CollectionListPage").then((m) => ({ default: m.CollectionListPage })));
const CollectionDetailPage = lazy(() => import("@/pages/catalog/CollectionDetailPage").then((m) => ({ default: m.CollectionDetailPage })));
const CollectionFormPage = lazy(() => import("@/pages/catalog/CollectionFormPage").then((m) => ({ default: m.CollectionFormPage })));
const VariantDetailPage = lazy(() => import("@/pages/catalog/VariantDetailPage").then((m) => ({ default: m.VariantDetailPage })));
const FilterListPage = lazy(() => import("@/pages/catalog/FilterListPage").then((m) => ({ default: m.FilterListPage })));

// Orders
const OrderListPage = lazy(() => import("@/pages/orders/OrderListPage").then((m) => ({ default: m.OrderListPage })));
const OrderDetailPage = lazy(() => import("@/pages/orders/OrderDetailPage").then((m) => ({ default: m.OrderDetailPage })));
const DraftOrderFormPage = lazy(() => import("@/pages/orders/DraftOrderFormPage").then((m) => ({ default: m.DraftOrderFormPage })));
const ReturnListPage = lazy(() => import("@/pages/orders/ReturnListPage").then((m) => ({ default: m.ReturnListPage })));
const RefundListPage = lazy(() => import("@/pages/orders/RefundListPage").then((m) => ({ default: m.RefundListPage })));

// Payments
const PaymentListPage = lazy(() => import("@/pages/payments/PaymentListPage").then((m) => ({ default: m.PaymentListPage })));
const PayoutListPage = lazy(() => import("@/pages/payments/PayoutListPage").then((m) => ({ default: m.PayoutListPage })));

// Discounts
const DiscountListPage = lazy(() => import("@/pages/discounts/DiscountListPage").then((m) => ({ default: m.DiscountListPage })));
const DiscountFormPage = lazy(() => import("@/pages/discounts/DiscountFormPage").then((m) => ({ default: m.DiscountFormPage })));
const CampaignListPage = lazy(() => import("@/pages/marketing/CampaignListPage").then((m) => ({ default: m.CampaignListPage })));
const CampaignFormPage = lazy(() => import("@/pages/marketing/CampaignFormPage").then((m) => ({ default: m.CampaignFormPage })));
const NewsletterCampaignsPage = lazy(() => import("@/pages/marketing/NewsletterCampaignsPage").then((m) => ({ default: m.NewsletterCampaignsPage })));

// Content
const ReviewModerationPage = lazy(() => import("@/pages/reviews/ReviewModerationPage").then((m) => ({ default: m.ReviewModerationPage })));
const PageListPage = lazy(() => import("@/pages/content/PageListPage").then((m) => ({ default: m.PageListPage })));
const PageFormPage = lazy(() => import("@/pages/content/PageFormPage").then((m) => ({ default: m.PageFormPage })));
const BlogListPage = lazy(() => import("@/pages/content/BlogListPage").then((m) => ({ default: m.BlogListPage })));
const BlogFormPage = lazy(() => import("@/pages/content/BlogFormPage").then((m) => ({ default: m.BlogFormPage })));
const BlogPostFormPage = lazy(() => import("@/pages/content/BlogPostFormPage").then((m) => ({ default: m.BlogPostFormPage })));
const ManageBlogsPage = lazy(() => import("@/pages/content/ManageBlogsPage").then((m) => ({ default: m.ManageBlogsPage })));
const FileListPage = lazy(() => import("@/pages/content/FileListPage").then((m) => ({ default: m.FileListPage })));
const FileDetailPage = lazy(() => import("@/pages/content/FileDetailPage").then((m) => ({ default: m.FileDetailPage })));

// System
const AuditLogPage = lazy(() => import("@/pages/system/AuditLogPage").then((m) => ({ default: m.AuditLogPage })));
const WebhookPage = lazy(() => import("@/pages/system/WebhookPage").then((m) => ({ default: m.WebhookPage })));
const UserListPage = lazy(() => import("@/pages/system/UserListPage").then((m) => ({ default: m.UserListPage })));
const PermissionMatrixPage = lazy(() => import("@/pages/system/PermissionMatrixPage").then((m) => ({ default: m.PermissionMatrixPage })));
const CommissionRulesPage = lazy(() => import("@/pages/system/CommissionRulesPage").then((m) => ({ default: m.CommissionRulesPage })));
const ShippingSettingsPage = lazy(() => import("@/pages/system/ShippingSettingsPage").then((m) => ({ default: m.ShippingSettingsPage })));
const PreferencesPage = lazy(() => import("@/pages/system/PreferencesPage").then((m) => ({ default: m.PreferencesPage })));
const PoliciesPage = lazy(() => import("@/pages/system/PoliciesPage").then((m) => ({ default: m.PoliciesPage })));
const PolicyEditPage = lazy(() => import("@/pages/system/PolicyEditPage").then((m) => ({ default: m.PolicyEditPage })));
const TaxSettingsPage = lazy(() => import("@/pages/system/TaxSettingsPage").then((m) => ({ default: m.TaxSettingsPage })));
const AnalyticsPage = lazy(() => import("@/pages/system/AnalyticsPage").then((m) => ({ default: m.AnalyticsPage })));
const GiftCardsPage = lazy(() => import("@/pages/system/GiftCardsPage").then((m) => ({ default: m.GiftCardsPage })));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage").then((m) => ({ default: m.NotFoundPage })));

/* -------------------------------------------------------------------------- */
/*  App                                                                        */
/* -------------------------------------------------------------------------- */

export function App() {
  // Bootstrap client-side observability once (Sentry + dataLayer).
  useEffect(() => {
    void initObservability();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ErrorBoundary boundaryName="app-root">
          <BrowserRouter>
            <Suspense fallback={<PageSkeleton />}>
              <Routes>
                {/* ── Public login pages ─────────────────────────────────── */}
                <Route path="/login" element={<VendorLoginPage />} />
                <Route path="/admin/login" element={<AdminLoginPage />} />
                <Route path="/admin/forgot-password" element={<AdminForgotPasswordPage />} />
                <Route path="/admin/reset-password" element={<AdminResetPasswordPage />} />

                {/* ── Admin routes ───────────────────────────────────────── */}
                <Route
                  path="/"
                  element={
                    <ProtectedRoute requiredType="admin">
                      <AdminLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<DashboardPage />} />

                  {/* Vendors */}
                  <Route path="vendors" element={<ProtectedRoute requiredPermission="vendor:read:any"><VendorListPage /></ProtectedRoute>} />
                  <Route path="vendors/approvals" element={<ProtectedRoute requiredPermission="vendor:approve"><VendorApprovalsPage /></ProtectedRoute>} />
                  <Route path="vendors/kyc" element={<ProtectedRoute requiredPermission="vendor-kyc:review:any"><VendorKycPage /></ProtectedRoute>} />
                  <Route path="vendors/new" element={<ProtectedRoute requiredPermission="vendor:update:any"><VendorFormPage /></ProtectedRoute>} />
                  <Route path="vendors/:id/edit" element={<ProtectedRoute requiredPermission="vendor:update:any"><VendorFormPage /></ProtectedRoute>} />
                  <Route path="vendors/:id/memberships" element={<ProtectedRoute requiredPermission="vendor:read:any"><VendorMembershipsPage /></ProtectedRoute>} />
                  <Route path="vendors/:id" element={<ProtectedRoute requiredPermission="vendor:read:any"><VendorDetailPage /></ProtectedRoute>} />

                  {/* Customers */}
                  <Route path="customers" element={<ProtectedRoute requiredPermission="customer:read:any"><CustomerListPage /></ProtectedRoute>} />
                  <Route path="customers/segments" element={<ProtectedRoute requiredPermission="customer-segment:manage:any"><CustomerSegmentsPage /></ProtectedRoute>} />
                  <Route path="customers/segments/:segmentId" element={<ProtectedRoute requiredPermission="customer-segment:manage:any"><CustomerSegmentDetailPage /></ProtectedRoute>} />
                  <Route path="customers/new" element={<ProtectedRoute requiredPermission="customer:update:any"><CustomerFormPage /></ProtectedRoute>} />
                  <Route path="customers/:id/edit" element={<ProtectedRoute requiredPermission="customer:update:any"><CustomerFormPage /></ProtectedRoute>} />
                  <Route path="customers/:id" element={<ProtectedRoute requiredPermission="customer:read:any"><CustomerDetailPage /></ProtectedRoute>} />

                  {/* Catalog */}
                  <Route path="catalog/products" element={<ProtectedRoute requiredPermission="product:read:any"><ProductListPage /></ProtectedRoute>} />
                  <Route path="catalog/products/new" element={<ProtectedRoute requiredPermission="product:update:any"><ProductFormPage /></ProtectedRoute>} />
                  <Route path="catalog/products/:productId/variants/:variantId" element={<ProtectedRoute requiredPermission="product:read:any"><VariantDetailPage /></ProtectedRoute>} />
                  <Route path="catalog/products/:id/edit" element={<ProtectedRoute requiredPermission="product:update:any"><ProductFormPage /></ProtectedRoute>} />
                  <Route path="catalog/products/:id" element={<ProtectedRoute requiredPermission="product:read:any"><ProductDetailPage /></ProtectedRoute>} />
                  <Route path="catalog/collections" element={<ProtectedRoute requiredPermission="collection:manage:any"><CollectionListPage /></ProtectedRoute>} />
                  <Route path="catalog/collections/new" element={<ProtectedRoute requiredPermission="collection:manage:any"><CollectionFormPage /></ProtectedRoute>} />
                  <Route path="catalog/collections/:id/edit" element={<ProtectedRoute requiredPermission="collection:manage:any"><CollectionFormPage /></ProtectedRoute>} />
                  <Route path="catalog/collections/:id" element={<ProtectedRoute requiredPermission="collection:manage:any"><CollectionDetailPage /></ProtectedRoute>} />
                  <Route path="catalog/filters" element={<ProtectedRoute requiredPermission="facet-filter:manage:any"><FilterListPage /></ProtectedRoute>} />

                  {/* Orders */}
                  <Route path="orders" element={<ProtectedRoute requiredPermission="order:read:any"><OrderListPage /></ProtectedRoute>} />
                  <Route path="orders/new" element={<ProtectedRoute requiredPermission="order:create:any"><DraftOrderFormPage /></ProtectedRoute>} />
                  <Route path="orders/returns" element={<ProtectedRoute requiredPermission="return:manage:any"><ReturnListPage /></ProtectedRoute>} />
                  <Route path="orders/refunds" element={<ProtectedRoute requiredPermission="refund:read:any"><RefundListPage /></ProtectedRoute>} />
                  <Route path="orders/:id" element={<ProtectedRoute requiredPermission="order:read:any"><OrderDetailPage /></ProtectedRoute>} />
                  <Route path="orders/:id/edit" element={<ProtectedRoute requiredPermission="order:create:any"><DraftOrderFormPage /></ProtectedRoute>} />

                  {/* Payments */}
                  <Route path="payments" element={<ProtectedRoute requiredPermission="payment:read:any"><PaymentListPage /></ProtectedRoute>} />
                  <Route path="payments/payouts" element={<ProtectedRoute requiredPermission="payout:manage:any"><PayoutListPage /></ProtectedRoute>} />

                  {/* Discounts */}
                  <Route path="discounts" element={<ProtectedRoute requiredPermission="discount:manage:any"><DiscountListPage /></ProtectedRoute>} />
                  <Route path="discounts/new" element={<ProtectedRoute requiredPermission="discount:manage:any"><DiscountFormPage /></ProtectedRoute>} />
                  <Route path="discounts/:id" element={<ProtectedRoute requiredPermission="discount:manage:any"><DiscountFormPage /></ProtectedRoute>} />

                  {/* Marketing campaigns */}
                  <Route path="marketing/campaigns" element={<ProtectedRoute requiredPermission="campaign:manage:any"><CampaignListPage /></ProtectedRoute>} />
                  <Route path="marketing/campaigns/new" element={<ProtectedRoute requiredPermission="campaign:manage:any"><CampaignFormPage /></ProtectedRoute>} />
                  <Route path="marketing/campaigns/:id" element={<ProtectedRoute requiredPermission="campaign:manage:any"><CampaignFormPage /></ProtectedRoute>} />
                  <Route path="marketing/newsletter" element={<ProtectedRoute requiredPermission="settings:manage"><NewsletterCampaignsPage /></ProtectedRoute>} />

                  {/* Engagement */}
                  <Route path="reviews" element={<ProtectedRoute requiredPermission="review:read:any"><ReviewModerationPage /></ProtectedRoute>} />
                  <Route path="content/pages" element={<ProtectedRoute requiredPermission="page:manage:any"><PageListPage /></ProtectedRoute>} />
                  <Route path="content/pages/new" element={<ProtectedRoute requiredPermission="page:manage:any"><PageFormPage /></ProtectedRoute>} />
                  <Route path="content/pages/:id" element={<ProtectedRoute requiredPermission="page:manage:any"><PageFormPage /></ProtectedRoute>} />
                  <Route path="content/blogs" element={<ProtectedRoute requiredPermission="blog:manage:any"><BlogListPage /></ProtectedRoute>} />
                  <Route path="content/blogs/manage" element={<ProtectedRoute requiredPermission="blog:manage:any"><ManageBlogsPage /></ProtectedRoute>} />
                  <Route path="content/blogs/new" element={<ProtectedRoute requiredPermission="blog:manage:any"><BlogFormPage /></ProtectedRoute>} />
                  <Route path="content/blogs/:id" element={<ProtectedRoute requiredPermission="blog:manage:any"><BlogFormPage /></ProtectedRoute>} />
                  <Route path="content/blog-posts/new" element={<ProtectedRoute requiredPermission="blog:manage:any"><BlogPostFormPage /></ProtectedRoute>} />
                  <Route path="content/blog-posts/:id" element={<ProtectedRoute requiredPermission="blog:manage:any"><BlogPostFormPage /></ProtectedRoute>} />
                  <Route path="content/files" element={<ProtectedRoute requiredPermission="file:manage:any"><FileListPage /></ProtectedRoute>} />
                  <Route path="content/files/:id" element={<ProtectedRoute requiredPermission="file:manage:any"><FileDetailPage /></ProtectedRoute>} />

                  {/* System — permission-gated routes */}
                  <Route path="system/audit-logs" element={<ProtectedRoute requiredPermission="audit-log:read:any"><AuditLogPage /></ProtectedRoute>} />
                  <Route path="system/webhooks" element={<ProtectedRoute requiredPermission="webhook:manage:any"><WebhookPage /></ProtectedRoute>} />
                  <Route path="system/users" element={<ProtectedRoute requiredPermission="user:read:any"><UserListPage /></ProtectedRoute>} />
                  <Route path="system/permissions" element={<ProtectedRoute requiredPermission="user:read:any"><PermissionMatrixPage /></ProtectedRoute>} />
                  <Route path="system/commission-rules" element={<ProtectedRoute requiredPermission="commission-rule:manage:any"><CommissionRulesPage /></ProtectedRoute>} />
                  <Route path="system/shipping" element={<ProtectedRoute requiredPermission="settings:manage"><ShippingSettingsPage /></ProtectedRoute>} />
                  <Route path="system/preferences" element={<ProtectedRoute requiredPermission="settings:manage"><PreferencesPage /></ProtectedRoute>} />
                  <Route path="system/tax" element={<ProtectedRoute requiredPermission="settings:manage"><TaxSettingsPage /></ProtectedRoute>} />
                  <Route path="system/analytics" element={<ProtectedRoute requiredPermission="dashboard:read:any"><AnalyticsPage /></ProtectedRoute>} />
                  <Route path="system/gift-cards" element={<ProtectedRoute requiredPermission="settings:manage"><GiftCardsPage /></ProtectedRoute>} />
                  <Route path="system/policies" element={<ProtectedRoute requiredPermission="settings:manage"><PoliciesPage /></ProtectedRoute>} />
                  <Route path="system/policies/:slug" element={<ProtectedRoute requiredPermission="settings:manage"><PolicyEditPage /></ProtectedRoute>} />
                </Route>

                {/* ── Vendor routes ──────────────────────────────────────── */}
                <Route
                  path="/vendor"
                  element={
                    <ProtectedRoute requiredType="vendor">
                      <VendorLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<VendorDashboardPage />} />
                  <Route path="dashboard" element={<VendorDashboardPage />} />
                  <Route path="analytics" element={<VendorAnalyticsPage />} />
                  <Route path="products" element={<VendorProductsPage />} />
                  <Route path="products/new" element={<VendorProductFormPage />} />
                  <Route path="products/:id" element={<VendorProductFormPage />} />
                  <Route path="orders" element={<VendorOrdersPage />} />
                  <Route path="orders/:id" element={<VendorOrderDetailPage />} />
                  <Route path="messages" element={<VendorMessagesPage />} />
                  <Route path="messages/:id" element={<VendorMessageThreadPage />} />
                  <Route path="reviews" element={<VendorReviewsPage />} />
                </Route>

                {/* ── Catch-all 404 ─────────────────────────────────────── */}
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
          <Toaster />
          <ConfirmDialogHost />
        </ErrorBoundary>
      </AuthProvider>
    </QueryClientProvider>
  );
}
