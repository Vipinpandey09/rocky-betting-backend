import { listNotifications } from "./notifications.routes.js";
export async function notificationsRoutes(app) {
    await listNotifications(app);
}
