import { db } from "../../lib/db.js";

export async function listLeaguesController() {
  return db.selectFrom("leagues").selectAll().where("active", "=", true).execute();
}
