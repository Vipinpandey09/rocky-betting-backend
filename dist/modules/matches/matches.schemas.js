import { z } from "zod";
export const matchQuerySchema = z.object({
    status: z.enum(["SCHEDULED", "LIVE", "FINISHED"]).optional()
});
export const matchParamsSchema = z.object({
    id: z.string().uuid()
});
