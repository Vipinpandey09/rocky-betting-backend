export interface AuthUser {
  id: string;
  email: string;
  role: "USER" | "ADMIN";
}

declare module "fastify" {
  interface FastifyRequest {
    authUser?: AuthUser;
  }
}
