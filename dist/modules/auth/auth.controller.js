import { authService } from "./auth.service.js";
export async function registerController(request) {
    const { email, password, name } = request.body;
    return authService.register({ email, password, name });
}
export async function loginController(request) {
    const { email, password } = request.body;
    return authService.login({ email, password });
}
export async function refreshController(request) {
    const { refreshToken } = request.body;
    return authService.refresh(refreshToken);
}
export async function meController(request) {
    return request.authUser;
}
