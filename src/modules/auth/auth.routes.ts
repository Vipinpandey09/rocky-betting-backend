import type { FastifyInstance } from "fastify";
import { validateBody } from "../../lib/validation.js";
import { loginSchema, refreshSchema, registerSchema } from "./auth.schemas.js";
import { loginController, meController, refreshController, registerController } from "./auth.controller.js";
import { authenticate } from "./auth.middleware.js";

const basePath = "/api/auth";

export async function registerUser(app: FastifyInstance) {
  app.post(`${basePath}/register`, { preHandler: [validateBody(registerSchema)] }, registerController);
}

export async function loginUser(app: FastifyInstance) {
  app.post(`${basePath}/login`, { preHandler: [validateBody(loginSchema)] }, loginController);
}

export async function refreshUser(app: FastifyInstance) {
  app.post(`${basePath}/refresh`, { preHandler: [validateBody(refreshSchema)] }, refreshController);
}

export async function getMe(app: FastifyInstance) {
  app.get(`${basePath}/me`, { preHandler: [authenticate] }, meController);
}
