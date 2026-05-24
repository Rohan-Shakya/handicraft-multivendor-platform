import { pgTable, text, timestamp, pgEnum, index, jsonb } from "drizzle-orm/pg-core";
import { vendors } from "./vendors";
import { users } from "./users";
import { files } from "./files";

export const vendorKycStatusEnum = pgEnum("vendor_kyc_status", [
  "pending",
  "under_review",
  "approved",
  "rejected",
]);

export const vendorKycDocumentTypeEnum = pgEnum("vendor_kyc_document_type", [
  "registration_certificate",
  "tax_document",
  "vat_document",
  "owner_identity",
  "bank_proof",
  "address_proof",
  "other",
]);

export const vendorKycs = pgTable(
  "vendor_kycs",
  {
    id: text("id").primaryKey(),
    vendorId: text("vendor_id")
      .notNull()
      .references(() => vendors.id, { onDelete: "cascade" }),
    status: vendorKycStatusEnum("status").notNull().default("pending"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewedBy: text("reviewed_by").references(() => users.id, {
      onDelete: "set null",
    }),
    rejectionReason: text("rejection_reason"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("vendor_kycs_vendor_id_idx").on(t.vendorId),
    index("vendor_kycs_status_idx").on(t.status),
  ]
);

export const vendorKycDocuments = pgTable(
  "vendor_kyc_documents",
  {
    id: text("id").primaryKey(),
    vendorKycId: text("vendor_kyc_id")
      .notNull()
      .references(() => vendorKycs.id, { onDelete: "cascade" }),
    documentType: vendorKycDocumentTypeEnum("document_type").notNull(),
    fileId: text("file_id")
      .notNull()
      .references(() => files.id, { onDelete: "restrict" }),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("vendor_kyc_documents_vendor_kyc_id_idx").on(t.vendorKycId),
    index("vendor_kyc_documents_document_type_idx").on(t.documentType),
    index("vendor_kyc_documents_file_id_idx").on(t.fileId),
  ]
);
