import type { FastifyInstance } from "fastify";
import { searchIndex } from "./search.routes.js";

export async function searchRoutes(app: FastifyInstance) {
  await searchIndex(app);
}

export { searchService } from "./search.service.js";
