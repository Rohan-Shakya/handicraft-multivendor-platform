import { z } from "zod";

const platformRoleEnum = z.enum(["super_admin", "support_agent"]);

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  role: platformRoleEnum.default("support_agent"),
});

export const updateUserSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  firstName: z.string().max(100).nullish(),
  lastName: z.string().max(100).nullish(),
  role: platformRoleEnum.optional(),
  isActive: z.boolean().optional(),
});

export const userFiltersSchema = z.object({
  role: platformRoleEnum.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
