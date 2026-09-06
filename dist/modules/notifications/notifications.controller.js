import { db } from "../../lib/db.js";
export async function listNotificationsController(request) {
    return db.selectFrom("notifications")
        .selectAll()
        .where("user_id", "=", request.authUser.id)
        .orderBy("created_at", "desc")
        .execute();
}
