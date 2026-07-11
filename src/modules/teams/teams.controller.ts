import { db } from "../../lib/db.js";

export async function listTeamsController() {
  return db.selectFrom("teams").selectAll().execute();
}
