// Re-export from auth module for backward compatibility
export type { AuthUser } from "../modules/auth/auth.types.js";

// Re-export the Fastify module augmentation
import "../modules/auth/auth.types.js";
