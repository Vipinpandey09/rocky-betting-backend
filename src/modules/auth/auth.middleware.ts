import type { FastifyReply, FastifyRequest } from "fastify";
import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";
import { AppError } from "../../lib/errors.js";
import type { AuthUser } from "./auth.types.js";

export async function authenticate(request: FastifyRequest, _reply: FastifyReply) {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw new AppError("Missing access token", 401, "UNAUTHORIZED");
  }

  try {
    request.authUser = jwt.verify(header.slice(7), env.JWT_ACCESS_SECRET) as AuthUser;
  } catch {
    throw new AppError("Invalid access token", 401, "UNAUTHORIZED");
  }
}

export function requireRole(...roles: Array<AuthUser["role"]>) {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    if (!request.authUser || !roles.includes(request.authUser.role)) {
      throw new AppError("Insufficient permissions", 403, "FORBIDDEN");
    }
  };
}
