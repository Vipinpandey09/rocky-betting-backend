import { db } from "../../lib/db.js";
export async function listOddsController() {
    return db.selectFrom("odds").selectAll().execute();
}
