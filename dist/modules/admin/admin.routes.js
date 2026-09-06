import { authenticate, requireRole } from "../auth/auth.middleware.js";
import { validateBody, validateParams, validateQuery } from "../../lib/validation.js";
import { adminUsersQuerySchema, finishMatchSchema, idParamSchema, settleBetSchema, updateOddsPriceSchema, updateUserStatusSchema } from "./admin.schemas.js";
import { finishMatchController, getReportSummaryController, listAuditLogsController, listDepositsController, listUsersController, listWithdrawalsController, settleBetController, startMatchController, nextBallController, updateOddsPriceController, updateUserStatusController, approveDepositController, rejectDepositController, approveWithdrawalController, rejectWithdrawalController } from "./admin.controller.js";
const basePath = "/api/admin";
const adminAuth = [authenticate, requireRole("ADMIN")];
export async function listUsers(app) {
    app.get(`${basePath}/users`, { preHandler: [...adminAuth, validateQuery(adminUsersQuerySchema)] }, listUsersController);
}
export async function updateUserStatus(app) {
    app.patch(`${basePath}/users/:id/status`, { preHandler: [...adminAuth, validateParams(idParamSchema), validateBody(updateUserStatusSchema)] }, updateUserStatusController);
}
export async function startMatch(app) {
    app.post(`${basePath}/matches/:id/start`, { preHandler: [...adminAuth, validateParams(idParamSchema)] }, startMatchController);
}
export async function nextBall(app) {
    app.post(`${basePath}/matches/:id/next-ball`, { preHandler: [...adminAuth, validateParams(idParamSchema)] }, nextBallController);
}
export async function finishMatch(app) {
    app.post(`${basePath}/matches/:id/finish`, { preHandler: [...adminAuth, validateParams(idParamSchema), validateBody(finishMatchSchema)] }, finishMatchController);
}
export async function updateOddsPrice(app) {
    app.patch(`${basePath}/odds/:id`, { preHandler: [...adminAuth, validateParams(idParamSchema), validateBody(updateOddsPriceSchema)] }, updateOddsPriceController);
}
export async function settleBet(app) {
    app.post(`${basePath}/settlement/bets/:id`, { preHandler: [...adminAuth, validateParams(idParamSchema), validateBody(settleBetSchema)] }, settleBetController);
}
export async function listDeposits(app) {
    app.get(`${basePath}/deposits`, { preHandler: adminAuth }, listDepositsController);
}
export async function listWithdrawals(app) {
    app.get(`${basePath}/withdrawals`, { preHandler: adminAuth }, listWithdrawalsController);
}
export async function listAuditLogs(app) {
    app.get(`${basePath}/audit-logs`, { preHandler: adminAuth }, listAuditLogsController);
}
export async function getReportSummary(app) {
    app.get(`${basePath}/reports/summary`, { preHandler: adminAuth }, getReportSummaryController);
}
export async function approveDeposit(app) {
    app.post(`${basePath}/deposits/:id/approve`, { preHandler: [...adminAuth, validateParams(idParamSchema)] }, approveDepositController);
}
export async function rejectDeposit(app) {
    app.post(`${basePath}/deposits/:id/reject`, { preHandler: [...adminAuth, validateParams(idParamSchema)] }, rejectDepositController);
}
export async function approveWithdrawal(app) {
    app.post(`${basePath}/withdrawals/:id/approve`, { preHandler: [...adminAuth, validateParams(idParamSchema)] }, approveWithdrawalController);
}
export async function rejectWithdrawal(app) {
    app.post(`${basePath}/withdrawals/:id/reject`, { preHandler: [...adminAuth, validateParams(idParamSchema)] }, rejectWithdrawalController);
}
