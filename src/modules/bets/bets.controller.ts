import type { FastifyRequest } from "fastify";
import { betsService } from "./bets.service.js";

export async function listBetsController(request: FastifyRequest) {
  return betsService.list(request.authUser!.id);
}

export async function placeBetController(request: FastifyRequest) {
  const body = request.body as { stake: number; selections: Array<{ oddId: string }> };
  return betsService.place(request.authUser!.id, body);
}
