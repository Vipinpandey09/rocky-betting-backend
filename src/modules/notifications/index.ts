import type { FastifyInstance } from "fastify";
import { listNotifications } from "./notifications.routes.js";

export async function notificationsRoutes(app: FastifyInstance) {
  await listNotifications(app);
}
