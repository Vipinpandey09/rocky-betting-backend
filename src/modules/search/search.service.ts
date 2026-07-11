import { elasticsearch } from "../../lib/elasticsearch.js";

const indexes = ["matches", "teams", "users", "transactions"] as const;
type SearchIndex = (typeof indexes)[number];

export class SearchService {
  async ensureIndexes() {
    for (const index of indexes) {
      const exists = await elasticsearch.indices.exists({ index });
      if (!exists) {
        await elasticsearch.indices.create({ index });
      }
    }
  }

  async index(index: SearchIndex, id: string, document: Record<string, unknown>) {
    await elasticsearch.index({ index, id, document });
  }

  async search(index: SearchIndex, query: string) {
    const result = await elasticsearch.search({
      index,
      query: {
        multi_match: {
          query,
          fields: ["name^3", "email^2", "country", "status", "reference"]
        }
      }
    });

    return result.hits.hits.map((hit) => ({ id: hit._id, ...hit._source as object }));
  }
}

export const searchService = new SearchService();
