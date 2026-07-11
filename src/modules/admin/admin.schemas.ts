import { z } from "zod";

export const idParamSchema = z.object({
  id: z.string().uuid()
});

export const updateUserStatusSchema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED"])
});

export const finishMatchSchema = z.object({
  homeScore: z.number().int().min(0),
  awayScore: z.number().int().min(0)
});

export const updateOddsPriceSchema = z.object({
  price: z.number().positive()
});

export const settleBetSchema = z.object({
  result: z.enum(["WON", "LOST", "VOID"])
});

export const adminUsersQuerySchema = z.object({
  search: z.string().optional()
});
