import { elasticsearch } from "../../lib/elasticsearch.js";
const indexes = ["matches", "teams", "users", "transactions"];
export class SearchService {
    async ensureIndexes() {
        for (const index of indexes) {
            const exists = await elasticsearch.indices.exists({ index });
            if (!exists) {
                await elasticsearch.indices.create({ index });
            }
        }
    }
    async index(index, id, document) {
        await elasticsearch.index({ index, id, document });
    }
    async search(index, query) {
        const result = await elasticsearch.search({
            index,
            query: {
                multi_match: {
                    query,
                    fields: ["name^3", "email^2", "country", "status", "reference"]
                }
            }
        });
        return result.hits.hits.map((hit) => ({ id: hit._id, ...hit._source }));
    }
}
export const searchService = new SearchService();
