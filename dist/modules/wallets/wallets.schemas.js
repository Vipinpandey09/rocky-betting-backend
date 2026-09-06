import { z } from "zod";
export const amountBodySchema = z.object({
    amount: z.number().positive()
});
