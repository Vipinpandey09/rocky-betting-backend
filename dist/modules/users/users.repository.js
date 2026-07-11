import { db } from "../../lib/db.js";
export class UsersRepository {
    findById(id) {
        return db.selectFrom("users")
            .innerJoin("roles", "roles.id", "users.role_id")
            .select(["users.id", "users.email", "users.name", "users.password_hash", "users.status", "roles.name as role"])
            .where("users.id", "=", id)
            .executeTakeFirst();
    }
    findByEmail(email) {
        return db.selectFrom("users")
            .innerJoin("roles", "roles.id", "users.role_id")
            .select(["users.id", "users.email", "users.name", "users.password_hash", "users.status", "roles.name as role"])
            .where("users.email", "=", email.toLowerCase())
            .executeTakeFirst();
    }
    list(search) {
        let query = db.selectFrom("users")
            .innerJoin("roles", "roles.id", "users.role_id")
            .select(["users.id", "users.email", "users.name", "users.status", "roles.name as role", "users.created_at"])
            .orderBy("users.created_at", "desc");
        if (search) {
            query = query.where((eb) => eb.or([
                eb("users.email", "ilike", `%${search}%`),
                eb("users.name", "ilike", `%${search}%`)
            ]));
        }
        return query.execute();
    }
    create(user) {
        return db.insertInto("users").values(user).returningAll().executeTakeFirstOrThrow();
    }
    update(id, user) {
        return db.updateTable("users").set(user).where("id", "=", id).returningAll().executeTakeFirstOrThrow();
    }
    getRoleId(name) {
        return db.selectFrom("roles").select("id").where("name", "=", name).executeTakeFirstOrThrow();
    }
}
export const usersRepository = new UsersRepository();
