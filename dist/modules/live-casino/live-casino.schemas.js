import { z } from "zod";
export const liveCasinoGamesQuerySchema = z.object({
    window: z.string().default("30d")
});
export const liveCasinoGameParamsSchema = z.object({
    slug: z.string().min(1)
});
