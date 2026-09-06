import { listUsers, updateUserStatus, startMatch, nextBall, finishMatch, updateOddsPrice, settleBet, listDeposits, listWithdrawals, listAuditLogs, getReportSummary, approveDeposit, rejectDeposit, approveWithdrawal, rejectWithdrawal } from "./admin.routes.js";
export async function adminRoutes(app) {
    await listUsers(app);
    await updateUserStatus(app);
    await startMatch(app);
    await nextBall(app);
    await finishMatch(app);
    await updateOddsPrice(app);
    await settleBet(app);
    await listDeposits(app);
    await listWithdrawals(app);
    await listAuditLogs(app);
    await getReportSummary(app);
    await approveDeposit(app);
    await rejectDeposit(app);
    await approveWithdrawal(app);
    await rejectWithdrawal(app);
}
