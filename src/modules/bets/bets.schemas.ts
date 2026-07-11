import { z } from "zod";

export const placeBetSchema = z.object({
  stake: z.number().positive(),
  selections: z.array(z.object({
    oddId: z.string().uuid()
  })).min(1).max(12)
});
