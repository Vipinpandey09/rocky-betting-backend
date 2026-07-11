import type { FastifyRequest } from "fastify";
import { walletsService } from "./wallets.service.js";

export async function getWalletController(request: FastifyRequest) {
  return walletsService.getWallet(request.authUser!.id);
}

export async function getTransactionsController(request: FastifyRequest) {
  return walletsService.history(request.authUser!.id);
}

export async function depositController(request: FastifyRequest) {
  const { amount } = request.body as { amount: number };
  return walletsService.deposit(request.authUser!.id, amount);
}

export async function withdrawController(request: FastifyRequest) {
  const { amount } = request.body as { amount: number };
  return walletsService.withdraw(request.authUser!.id, amount);
}
