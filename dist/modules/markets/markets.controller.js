import { db } from "../../lib/db.js";
export async function listMarketsController() {
    return db.selectFrom("markets").selectAll().execute();
}
