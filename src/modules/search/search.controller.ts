import type { FastifyRequest } from "fastify";
import { searchService } from "./search.service.js";

export async function searchIndexController(request: FastifyRequest) {
  const { index } = request.params as { index: "matches" | "teams" | "users" | "transactions" };
  const { q } = request.query as { q: string };
  return searchService.search(index, q);
}
