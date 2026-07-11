import type { FastifyInstance } from "fastify";
import { validateParams, validateQuery } from "../../lib/validation.js";
import { searchParamsSchema, searchQuerySchema } from "./search.schemas.js";
import { searchIndexController } from "./search.controller.js";

const basePath = "/api/search";

export async function searchIndex(app: FastifyInstance) {
  app.get(`${basePath}/:index`, { preHandler: [validateParams(searchParamsSchema), validateQuery(searchQuerySchema)] }, searchIndexController);
}
