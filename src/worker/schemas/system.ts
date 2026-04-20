import { z } from "zod";

export const systemUserResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: z.string(),
  emailVerified: z.boolean(),
  banned: z.boolean(),
  ban_reason: z.string().nullable(),
  created_at: z.number().nullable(),
  updated_at: z.number().nullable(),
});

export const createSystemUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  role: z.enum(["user", "admin"]).default("user"),
});

export const inviteSystemUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  role: z.enum(["user", "admin"]).default("user"),
});

export const updateSystemUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  role: z.enum(["user", "admin"]).optional(),
  banned: z.boolean().optional(),
  ban_reason: z.string().max(500).nullable().optional(),
});
