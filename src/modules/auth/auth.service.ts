import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import { env } from "../../config/env.js";
import { db } from "../../lib/db.js";
import { AppError } from "../../lib/errors.js";
import { usersRepository } from "../users/users.repository.js";

export class AuthService {
  private signAccessToken(user: { id: string; email: string; role: "USER" | "ADMIN" }) {
    return jwt.sign(user, env.JWT_ACCESS_SECRET, { expiresIn: env.ACCESS_TOKEN_TTL as SignOptions["expiresIn"] });
  }

  private signRefreshToken(user: { id: string; email: string; role: "USER" | "ADMIN" }) {
    return jwt.sign(user, env.JWT_REFRESH_SECRET, { expiresIn: env.REFRESH_TOKEN_TTL as SignOptions["expiresIn"] });
  }

  async register(input: { email: string; password: string; name: string }) {
    const existing = await usersRepository.findByEmail(input.email);
    if (existing) throw new AppError("Email already registered", 409, "EMAIL_EXISTS");

    const role = await usersRepository.getRoleId("USER");
    const passwordHash = await bcrypt.hash(input.password, 12);

    const user = await db.transaction().execute(async (trx) => {
      const created = await trx.insertInto("users").values({
        email: input.email.toLowerCase(),
        password_hash: passwordHash,
        name: input.name,
        role_id: role.id,
        status: "ACTIVE"
      }).returningAll().executeTakeFirstOrThrow();

      await trx.insertInto("wallets").values({
        user_id: created.id,
        balance: 0,
        currency: "INR"
      }).execute();

      return created;
    });

    return this.tokens({ id: user.id, email: user.email, role: "USER" });
  }

  async login(input: { email: string; password: string }) {
    const user = await usersRepository.findByEmail(input.email);
    if (!user || user.status !== "ACTIVE" || !user.password_hash || !user.role) {
      throw new AppError("Invalid credentials", 401, "INVALID_CREDENTIALS");
    }

    let valid = false;
    try {
      valid = await bcrypt.compare(input.password, user.password_hash);
    } catch {
      throw new AppError("Invalid credentials", 401, "INVALID_CREDENTIALS");
    }

    if (!valid) throw new AppError("Invalid credentials", 401, "INVALID_CREDENTIALS");

    return this.tokens({ id: user.id, email: user.email, role: user.role });
  }

  refresh(refreshToken: string) {
    try {
      const payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as { id: string; email: string; role: "USER" | "ADMIN" };
      return this.tokens({ id: payload.id, email: payload.email, role: payload.role });
    } catch {
      throw new AppError("Invalid refresh token", 401, "INVALID_REFRESH_TOKEN");
    }
  }

  private tokens(user: { id: string; email: string; role: "USER" | "ADMIN" }) {
    return {
      user,
      accessToken: this.signAccessToken(user),
      refreshToken: this.signRefreshToken(user)
    };
  }
}

export const authService = new AuthService();
