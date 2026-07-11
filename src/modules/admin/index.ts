import type { FastifyInstance } from "fastify";
import {
  listUsers,
  updateUserStatus,
  startMatch,
  finishMatch,
  updateOddsPrice,
  settleBet,
  listDeposits,
  listWithdrawals,
  listAuditLogs,
  getReportSummary
} from "./admin.routes.js";

export async function adminRoutes(app: FastifyInstance) {
  await listUsers(app);
  await updateUserStatus(app);
  await startMatch(app);
  await finishMatch(app);
  await updateOddsPrice(app);
  await settleBet(app);
  await listDeposits(app);
  await listWithdrawals(app);
  await listAuditLogs(app);
  await getReportSummary(app);
}
