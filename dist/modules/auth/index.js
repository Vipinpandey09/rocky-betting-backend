import { registerUser, loginUser, refreshUser, getMe } from "./auth.routes.js";
export async function authRoutes(app) {
    await registerUser(app);
    await loginUser(app);
    await refreshUser(app);
    await getMe(app);
}
export { authenticate, requireRole } from "./auth.middleware.js";
export { authService } from "./auth.service.js";
