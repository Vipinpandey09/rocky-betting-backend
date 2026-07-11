import { db } from "../../lib/db.js";
import type { NewUser, UserUpdate } from "../../types/database.js";

export class UsersRepository {
  findById(id: string) {
    return db.selectFrom("users")
      .innerJoin("roles", "roles.id", "users.role_id")
      .select(["users.id", "users.email", "users.name", "users.password_hash", "users.status", "roles.name as role"])
      .where("users.id", "=", id)
      .executeTakeFirst();
  }

  findByEmail(email: string) {
    return db.selectFrom("users")
      .innerJoin("roles", "roles.id", "users.role_id")
      .select(["users.id", "users.email", "users.name", "users.password_hash", "users.status", "roles.name as role"])
      .where("users.email", "=", email.toLowerCase())
      .executeTakeFirst();
  }

  list(search?: string) {
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

  create(user: NewUser) {
    return db.insertInto("users").values(user).returningAll().executeTakeFirstOrThrow();
  }

  update(id: string, user: UserUpdate) {
    return db.updateTable("users").set(user).where("id", "=", id).returningAll().executeTakeFirstOrThrow();
  }

  getRoleId(name: "USER" | "ADMIN") {
    return db.selectFrom("roles").select("id").where("name", "=", name).executeTakeFirstOrThrow();
  }
}

export const usersRepository = new UsersRepository();
