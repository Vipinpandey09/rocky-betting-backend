import type { FastifyInstance } from "fastify";
import { authenticate, requireRole } from "../auth/auth.middleware.js";
import { validateBody, validateParams, validateQuery } from "../../lib/validation.js";
import {
  adminUsersQuerySchema,
  finishMatchSchema,
  idParamSchema,
  settleBetSchema,
  updateOddsPriceSchema,
  updateUserStatusSchema
} from "./admin.schemas.js";
import {
  finishMatchController,
  getReportSummaryController,
  listAuditLogsController,
  listDepositsController,
  listUsersController,
  listWithdrawalsController,
  settleBetController,
  startMatchController,
  updateOddsPriceController,
  updateUserStatusController
} from "./admin.controller.js";

const basePath = "/api/admin";
const adminAuth = [authenticate, requireRole("ADMIN")];

export async function listUsers(app: FastifyInstance) {
  app.get(`${basePath}/users`, { preHandler: [...adminAuth, validateQuery(adminUsersQuerySchema)] }, listUsersController);
}

export async function updateUserStatus(app: FastifyInstance) {
  app.patch(`${basePath}/users/:id/status`, { preHandler: [...adminAuth, validateParams(idParamSchema), validateBody(updateUserStatusSchema)] }, updateUserStatusController);
}

export async function startMatch(app: FastifyInstance) {
  app.post(`${basePath}/matches/:id/start`, { preHandler: [...adminAuth, validateParams(idParamSchema)] }, startMatchController);
}

export async function finishMatch(app: FastifyInstance) {
  app.post(`${basePath}/matches/:id/finish`, { preHandler: [...adminAuth, validateParams(idParamSchema), validateBody(finishMatchSchema)] }, finishMatchController);
}

export async function updateOddsPrice(app: FastifyInstance) {
  app.patch(`${basePath}/odds/:id`, { preHandler: [...adminAuth, validateParams(idParamSchema), validateBody(updateOddsPriceSchema)] }, updateOddsPriceController);
}

export async function settleBet(app: FastifyInstance) {
  app.post(`${basePath}/settlement/bets/:id`, { preHandler: [...adminAuth, validateParams(idParamSchema), validateBody(settleBetSchema)] }, settleBetController);
}

export async function listDeposits(app: FastifyInstance) {
  app.get(`${basePath}/deposits`, { preHandler: adminAuth }, listDepositsController);
}

export async function listWithdrawals(app: FastifyInstance) {
  app.get(`${basePath}/withdrawals`, { preHandler: adminAuth }, listWithdrawalsController);
}

export async function listAuditLogs(app: FastifyInstance) {
  app.get(`${basePath}/audit-logs`, { preHandler: adminAuth }, listAuditLogsController);
}

export async function getReportSummary(app: FastifyInstance) {
  app.get(`${basePath}/reports/summary`, { preHandler: adminAuth }, getReportSummaryController);
}
