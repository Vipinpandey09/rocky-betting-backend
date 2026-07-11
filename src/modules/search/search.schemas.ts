import { z } from "zod";

export const searchParamsSchema = z.object({
  index: z.enum(["matches", "teams", "users", "transactions"])
});

export const searchQuerySchema = z.object({
  q: z.string().min(1)
});
