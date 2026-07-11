import type { FastifyInstance } from "fastify";
import { registerUser, loginUser, refreshUser, getMe } from "./auth.routes.js";

export async function authRoutes(app: FastifyInstance) {
  await registerUser(app);
  await loginUser(app);
  await refreshUser(app);
  await getMe(app);
}

export { authenticate, requireRole } from "./auth.middleware.js";
export { authService } from "./auth.service.js";
export type { AuthUser } from "./auth.types.js";
