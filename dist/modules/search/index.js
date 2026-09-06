import { searchIndex } from "./search.routes.js";
export async function searchRoutes(app) {
    await searchIndex(app);
}
export { searchService } from "./search.service.js";
