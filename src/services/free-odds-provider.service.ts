export interface FreeOddsProviderMatch {
  homeTeam: string;
  awayTeam: string;
  homePrice: number;
  awayPrice: number;
}

export class FreeOddsProviderService {
  async getCricketOdds(): Promise<FreeOddsProviderMatch[]> {
    return [];
  }
}

export const freeOddsProviderService = new FreeOddsProviderService();
