import { searchService } from "./search.service.js";
export async function searchIndexController(request) {
    const { index } = request.params;
    const { q } = request.query;
    return searchService.search(index, q);
}
