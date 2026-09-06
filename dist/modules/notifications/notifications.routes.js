import { authenticate } from "../auth/auth.middleware.js";
import { listNotificationsController } from "./notifications.controller.js";
const basePath = "/api/notifications";
export async function listNotifications(app) {
    app.get(basePath, { preHandler: [authenticate] }, listNotificationsController);
}
