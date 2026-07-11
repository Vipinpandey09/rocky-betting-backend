import { z } from "zod";
import { authenticate, requireRole } from "../middleware/auth.js";
import { authService } from "../modules/auth/auth.service.js";
import { loginSchema, refreshSchema, registerSchema } from "../modules/auth/auth.schemas.js";
import { betsService } from "../modules/bets/bets.service.js";
import { placeBetSchema } from "../modules/bets/bets.schemas.js";
import { matchesService } from "../modules/matches/matches.service.js";
import { oddsService } from "../modules/odds/odds.service.js";
import { settlementService } from "../modules/settlement/settlement.service.js";
import { usersRepository } from "../modules/users/users.repository.js";
import { walletsService } from "../modules/wallets/wallets.service.js";
import { db } from "../lib/db.js";
import { apiSportsService } from "../services/api-sports.service.js";
import { liveCasinoDataService } from "../services/live-casino-data.service.js";
import { searchService } from "../services/search.service.js";
import { cricketService } from "../services/cricket.service.js";
const idParam = z.object({ id: z.string().uuid() });
const amountBody = z.object({ amount: z.number().positive() });
export async function registerRoutes(app) {
    app.get("/health", async () => ({ status: "ok" }));
    app.post("/api/auth/register", async (request) => authService.register(registerSchema.parse(request.body)));
    app.post("/api/auth/login", async (request) => authService.login(loginSchema.parse(request.body)));
    app.post("/api/auth/refresh", async (request) => {
        const body = refreshSchema.parse(request.body);
        return authService.refresh(body.refreshToken);
    });
    app.get("/api/auth/me", { preHandler: [authenticate] }, async (request) => request.authUser);
    app.get("/api/sports", async () => db.selectFrom("sports").selectAll().where("active", "=", true).execute());
    app.get("/api/leagues", async () => db.selectFrom("leagues").selectAll().where("active", "=", true).execute());
    app.get("/api/teams", async () => db.selectFrom("teams").selectAll().execute());
    app.get("/api/matches", async (request) => {
        const query = z.object({ status: z.enum(["SCHEDULED", "LIVE", "FINISHED"]).optional() }).parse(request.query);
        try {
            await cricketService.syncMatchesToDatabase();
        }
        catch (error) {
            request.log.error(error, "Failed to sync cricket matches");
        }
        try {
            await Promise.all([
                apiSportsService.syncSportMatchesToDatabase("football"),
                apiSportsService.syncSportMatchesToDatabase("volleyball")
            ]);
        }
        catch (error) {
            request.log.error(error, "Failed to sync API-Sports matches");
        }
        return matchesService.list(query.status);
    });
    app.get("/api/cricket/live", async () => cricketService.getLiveMatchSummaries());
    app.get("/api/matches/:id", async (request) => matchesService.detail(idParam.parse(request.params).id));
    app.get("/api/apisports/:sport/leagues", async (request) => {
        const params = z.object({ sport: z.enum(["football", "volleyball"]) }).parse(request.params);
        return apiSportsService.getLeagues(params.sport);
    });
    app.get("/api/live-casino/games", async (request) => {
        const query = z.object({ window: z.string().default("30d") }).parse(request.query);
        return liveCasinoDataService.getGames(query.window);
    });
    app.get("/api/live-casino/games/:slug", async (request) => {
        const params = z.object({ slug: z.string().min(1) }).parse(request.params);
        return liveCasinoDataService.getGame(params.slug);
    });
    app.get("/api/live-casino/stats", async () => liveCasinoDataService.getStats());
    app.get("/api/live-casino/fairness", async () => liveCasinoDataService.getFairness());
    app.get("/api/markets", async () => db.selectFrom("markets").selectAll().execute());
    app.get("/api/odds", async () => db.selectFrom("odds").selectAll().execute());
    app.get("/api/wallet", { preHandler: [authenticate] }, async (request) => walletsService.getWallet(request.authUser.id));
    app.get("/api/wallet/transactions", { preHandler: [authenticate] }, async (request) => walletsService.history(request.authUser.id));
    app.post("/api/wallet/deposit", { preHandler: [authenticate] }, async (request) => {
        const body = amountBody.parse(request.body);
        return walletsService.deposit(request.authUser.id, body.amount);
    });
    app.post("/api/wallet/withdraw", { preHandler: [authenticate] }, async (request) => {
        const body = amountBody.parse(request.body);
        return walletsService.withdraw(request.authUser.id, body.amount);
    });
    app.get("/api/bets", { preHandler: [authenticate] }, async (request) => betsService.list(request.authUser.id));
    app.post("/api/bets", { preHandler: [authenticate] }, async (request) => {
        const body = placeBetSchema.parse(request.body);
        return betsService.place(request.authUser.id, body);
    });
    app.get("/api/notifications", { preHandler: [authenticate] }, async (request) => {
        return db.selectFrom("notifications").selectAll().where("user_id", "=", request.authUser.id).orderBy("created_at", "desc").execute();
    });
    app.get("/api/search/:index", async (request) => {
        const params = z.object({ index: z.enum(["matches", "teams", "users", "transactions"]) }).parse(request.params);
        const query = z.object({ q: z.string().min(1) }).parse(request.query);
        return searchService.search(params.index, query.q);
    });
    app.get("/api/admin/users", { preHandler: [authenticate, requireRole("ADMIN")] }, async (request) => {
        const query = z.object({ search: z.string().optional() }).parse(request.query);
        return usersRepository.list(query.search);
    });
    app.patch("/api/admin/users/:id/status", { preHandler: [authenticate, requireRole("ADMIN")] }, async (request) => {
        const params = idParam.parse(request.params);
        const body = z.object({ status: z.enum(["ACTIVE", "SUSPENDED"]) }).parse(request.body);
        return usersRepository.update(params.id, { status: body.status, updated_at: new Date() });
    });
    app.post("/api/admin/matches/:id/start", { preHandler: [authenticate, requireRole("ADMIN")] }, async (request) => {
        return matchesService.start(idParam.parse(request.params).id);
    });
    app.post("/api/admin/matches/:id/finish", { preHandler: [authenticate, requireRole("ADMIN")] }, async (request) => {
        const params = idParam.parse(request.params);
        const body = z.object({ homeScore: z.number().int().min(0), awayScore: z.number().int().min(0) }).parse(request.body);
        return settlementService.finishMatch(params.id, body.homeScore, body.awayScore);
    });
    app.patch("/api/admin/odds/:id", { preHandler: [authenticate, requireRole("ADMIN")] }, async (request) => {
        const params = idParam.parse(request.params);
        const body = z.object({ price: z.number().positive() }).parse(request.body);
        return oddsService.update(params.id, body.price);
    });
    app.post("/api/admin/settlement/bets/:id", { preHandler: [authenticate, requireRole("ADMIN")] }, async (request) => {
        const params = idParam.parse(request.params);
        const body = z.object({ result: z.enum(["WON", "LOST", "VOID"]) }).parse(request.body);
        return settlementService.settleBet(params.id, body.result);
    });
    app.get("/api/admin/deposits", { preHandler: [authenticate, requireRole("ADMIN")] }, async () => db.selectFrom("deposits").selectAll().orderBy("created_at", "desc").execute());
    app.get("/api/admin/withdrawals", { preHandler: [authenticate, requireRole("ADMIN")] }, async () => db.selectFrom("withdrawals").selectAll().orderBy("created_at", "desc").execute());
    app.get("/api/admin/audit-logs", { preHandler: [authenticate, requireRole("ADMIN")] }, async () => db.selectFrom("audit_logs").selectAll().orderBy("created_at", "desc").execute());
    app.get("/api/admin/reports/summary", { preHandler: [authenticate, requireRole("ADMIN")] }, async () => {
        const users = await db.selectFrom("users").select((eb) => eb.fn.countAll().as("count")).executeTakeFirst();
        const bets = await db.selectFrom("bets").select((eb) => [eb.fn.countAll().as("count"), eb.fn.sum("stake").as("stake")]).executeTakeFirst();
        const deposits = await db.selectFrom("deposits").select((eb) => eb.fn.sum("amount").as("amount")).executeTakeFirst();
        return { users: Number(users?.count ?? 0), bets: Number(bets?.count ?? 0), stake: Number(bets?.stake ?? 0), deposits: Number(deposits?.amount ?? 0) };
    });
}
