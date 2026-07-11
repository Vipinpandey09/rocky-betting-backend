import type { FastifyInstance } from "fastify";
import { authRoutes } from "../modules/auth/index.js";
import { matchesRoutes } from "../modules/matches/index.js";
import { sportsRoutes } from "../modules/sports/index.js";
import { leaguesRoutes } from "../modules/leagues/index.js";
import { teamsRoutes } from "../modules/teams/index.js";
import { marketsRoutes } from "../modules/markets/index.js";
import { oddsRoutes } from "../modules/odds/index.js";
import { walletsRoutes } from "../modules/wallets/index.js";
import { betsRoutes } from "../modules/bets/index.js";
import { notificationsRoutes } from "../modules/notifications/index.js";
import { adminRoutes } from "../modules/admin/index.js";
import { liveCasinoRoutes } from "../modules/live-casino/index.js";
import { searchRoutes } from "../modules/search/index.js";

export async function registerRoutes(app: FastifyInstance) {
  app.get("/health", async () => ({ status: "ok" }));

  await app.register(authRoutes);
  await app.register(matchesRoutes);
  await app.register(sportsRoutes);
  await app.register(leaguesRoutes);
  await app.register(teamsRoutes);
  await app.register(marketsRoutes);
  await app.register(oddsRoutes);
  await app.register(walletsRoutes);
  await app.register(betsRoutes);
  await app.register(notificationsRoutes);
  await app.register(adminRoutes);
  await app.register(liveCasinoRoutes);
  await app.register(searchRoutes);
}
