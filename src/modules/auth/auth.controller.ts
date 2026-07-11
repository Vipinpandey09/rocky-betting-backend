import type { FastifyRequest } from "fastify";
import { authService } from "./auth.service.js";

export async function registerController(request: FastifyRequest) {
  const { email, password, name } = request.body as { email: string; password: string; name: string };
  return authService.register({ email, password, name });
}

export async function loginController(request: FastifyRequest) {
  const { email, password } = request.body as { email: string; password: string };
  return authService.login({ email, password });
}

export async function refreshController(request: FastifyRequest) {
  const { refreshToken } = request.body as { refreshToken: string };
  return authService.refresh(refreshToken);
}

export async function meController(request: FastifyRequest) {
  return request.authUser;
}
