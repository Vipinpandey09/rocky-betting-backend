import { db } from "../../lib/db.js";
import { usersRepository } from "../users/users.repository.js";
import { matchesService } from "../matches/matches.service.js";
import { oddsService } from "../odds/odds.service.js";
import { settlementService } from "../settlement/settlement.service.js";
import { walletsService } from "../wallets/wallets.service.js";
export async function listUsersController(request) {
    const { search } = request.query;
    return usersRepository.list(search);
}
export async function updateUserStatusController(request) {
    const { id } = request.params;
    const { status } = request.body;
    return usersRepository.update(id, { status, updated_at: new Date() });
}
export async function startMatchController(request) {
    const { id } = request.params;
    return matchesService.start(id);
}
export async function nextBallController(request) {
    const { id } = request.params;
    return matchesService.nextBall(id);
}
export async function finishMatchController(request) {
    const { id } = request.params;
    const { homeScore, awayScore } = request.body;
    return settlementService.finishMatch(id, homeScore, awayScore);
}
export async function updateOddsPriceController(request) {
    const { id } = request.params;
    const { price } = request.body;
    return oddsService.update(id, price);
}
export async function settleBetController(request) {
    const { id } = request.params;
    const { result } = request.body;
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
    const users = await db.selectFrom("users").select((eb) => eb.fn.countAll().as("count")).executeTakeFirst();
    const bets = await db.selectFrom("bets").select((eb) => [eb.fn.countAll().as("count"), eb.fn.sum("stake").as("stake")]).executeTakeFirst();
    const deposits = await db.selectFrom("deposits").select((eb) => eb.fn.sum("amount").as("amount")).executeTakeFirst();
    return {
        users: Number(users?.count ?? 0),
        bets: Number(bets?.count ?? 0),
        stake: Number(bets?.stake ?? 0),
        deposits: Number(deposits?.amount ?? 0)
    };
}
export async function approveDepositController(request) {
    const { id } = request.params;
    return walletsService.approveDeposit(id);
}
export async function rejectDepositController(request) {
    const { id } = request.params;
    return walletsService.rejectDeposit(id);
}
export async function approveWithdrawalController(request) {
    const { id } = request.params;
    return walletsService.approveWithdraw(id);
}
export async function rejectWithdrawalController(request) {
    const { id } = request.params;
    return walletsService.rejectWithdraw(id);
}
