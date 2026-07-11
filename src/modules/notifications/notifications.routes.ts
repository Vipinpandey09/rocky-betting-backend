import type { FastifyInstance } from "fastify";
import { authenticate } from "../auth/auth.middleware.js";
import { listNotificationsController } from "./notifications.controller.js";

const basePath = "/api/notifications";

export async function listNotifications(app: FastifyInstance) {
  app.get(basePath, { preHandler: [authenticate] }, listNotificationsController);
}
