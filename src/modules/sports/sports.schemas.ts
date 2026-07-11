import { z } from "zod";

export const sportParamsSchema = z.object({
  sport: z.enum(["football", "volleyball"])
});
