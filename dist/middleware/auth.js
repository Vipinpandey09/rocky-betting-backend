import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { AppError } from "../lib/errors.js";
export async function authenticate(request, _reply) {
    const header = request.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
        throw new AppError("Missing access token", 401, "UNAUTHORIZED");
    }
    try {
        request.authUser = jwt.verify(header.slice(7), env.JWT_ACCESS_SECRET);
    }
    catch {
        throw new AppError("Invalid access token", 401, "UNAUTHORIZED");
    }
}
export function requireRole(...roles) {
    return async (request, _reply) => {
        if (!request.authUser || !roles.includes(request.authUser.role)) {
            throw new AppError("Insufficient permissions", 403, "FORBIDDEN");
        }
    };
}
