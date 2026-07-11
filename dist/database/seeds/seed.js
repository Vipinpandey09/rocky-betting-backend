import bcrypt from "bcryptjs";
import { db } from "../../lib/db.js";
async function main() {
    await db.insertInto("roles").values([{ name: "USER" }, { name: "ADMIN" }]).onConflict((oc) => oc.column("name").doNothing()).execute();
    const userRole = await db.selectFrom("roles").selectAll().where("name", "=", "USER").executeTakeFirstOrThrow();
    const adminRole = await db.selectFrom("roles").selectAll().where("name", "=", "ADMIN").executeTakeFirstOrThrow();
    const password_hash = await bcrypt.hash("password123", 12);
    const admin = await db.insertInto("users").values({ email: "admin@rocky.test", name: "Rocky Admin", password_hash, role_id: adminRole.id, status: "ACTIVE" }).onConflict((oc) => oc.column("email").doUpdateSet({ name: "Rocky Admin", password_hash, role_id: adminRole.id, status: "ACTIVE" })).returningAll().executeTakeFirstOrThrow();
    const user = await db.insertInto("users").values({ email: "user@rocky.test", name: "Rocky User", password_hash, role_id: userRole.id, status: "ACTIVE" }).onConflict((oc) => oc.column("email").doUpdateSet({ name: "Rocky User", password_hash, role_id: userRole.id, status: "ACTIVE" })).returningAll().executeTakeFirstOrThrow();
    await db.insertInto("wallets").values([{ user_id: admin.id, balance: 100000, currency: "INR" }, { user_id: user.id, balance: 10000, currency: "INR" }]).onConflict((oc) => oc.column("user_id").doNothing()).execute();
    const cricket = await db.insertInto("sports").values({ name: "Cricket", slug: "cricket", active: true }).onConflict((oc) => oc.column("slug").doUpdateSet({ active: true })).returningAll().executeTakeFirstOrThrow();
}
await main();
await db.destroy();
