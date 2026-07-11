import type { FastifyRequest } from "fastify";
import { db } from "../../lib/db.js";
import { usersRepository } from "../users/users.repository.js";
import { matchesService } from "../matches/matches.service.js";
import { oddsService } from "../odds/odds.service.js";
import { settlementService } from "../settlement/settlement.service.js";

export async function listUsersController(request: FastifyRequest) {
  const { search } = request.query as { search?: string };
  return usersRepository.list(search);
}

export async function updateUserStatusController(request: FastifyRequest) {
  const { id } = request.params as { id: string };
  const { status } = request.body as { status: "ACTIVE" | "SUSPENDED" };
  return usersRepository.update(id, { status, updated_at: new Date() });
}

export async function startMatchController(request: FastifyRequest) {
  const { id } = request.params as { id: string };
  return matchesService.start(id);
}

export async function finishMatchController(request: FastifyRequest) {
  const { id } = request.params as { id: string };
  const { homeScore, awayScore } = request.body as { homeScore: number; awayScore: number };
  return settlementService.finishMatch(id, homeScore, awayScore);
}

export async function updateOddsPriceController(request: FastifyRequest) {
  const { id } = request.params as { id: string };
  const { price } = request.body as { price: number };
  return oddsService.update(id, price);
}

export async function settleBetController(request: FastifyRequest) {
  const { id } = request.params as { id: string };
  const { result } = request.body as { result: "WON" | "LOST" | "VOID" };
  return settlementService.settleBet(id, result);
}

export async function listDepositsController() {
  return db.selectFrom("deposits").selectAll().orderBy("created_at", "desc").execute();
}

export async function listWithdrawalsController() {
  return db.selectFrom("withdrawals").selectAll().orderBy("created_at", "desc").execute();
}

export async function listAuditLogsController() {
  return db.selectFrom("audit_logs").selectAll().orderBy("created_at", "desc").execute();
}

export async function getReportSummaryController() {
  const users = await db.selectFrom("users").select((eb) => eb.fn.countAll<string>().as("count")).executeTakeFirst();
  const bets = await db.selectFrom("bets").select((eb) => [eb.fn.countAll<string>().as("count"), eb.fn.sum<string>("stake").as("stake")]).executeTakeFirst();
  const deposits = await db.selectFrom("deposits").select((eb) => eb.fn.sum<string>("amount").as("amount")).executeTakeFirst();
  return {
    users: Number(users?.count ?? 0),
    bets: Number(bets?.count ?? 0),
    stake: Number(bets?.stake ?? 0),
    deposits: Number(deposits?.amount ?? 0)
  };
}
