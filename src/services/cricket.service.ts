import crypto from "crypto";
import { env } from "../config/env.js";
import { db } from "../lib/db.js";

const BASE = "https://api.cricapi.com/v1";
const KEY  = env.CRICAPI_KEY;

export interface CricMatch {
  id: string;
  name: string;
  matchType: string;
  status: string;
  venue: string;
  date: string;
  dateTimeGMT: string;
  teams: string[];
  teamInfo?: Array<{ name: string; shortname: string; img: string }>;
  score?: Array<{ r: number; w: number; o: number; inning: string }>;
  series_id: string;
  matchStarted: boolean;
  matchEnded: boolean;
}

export interface CricApiResponse {
  status: string;
  data: CricMatch[];
  info: {
    hitsToday: number;
    hitsUsed: number;
    hitsLimit: number;
    totalRows: number;
  };
}

export interface LiveCricketMatchSummary {
  id: string;
  starts_at: string;
  status: "LIVE";
  home_team: string;
  away_team: string;
  league: string;
  home_score: number;
  away_score: number;
  sport_slug: "cricket";
  odds: Array<{ odd_id: string; selection_name: string; price: number }>;
}

function toUUID(str: string): string {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(str)) {
    return str.toLowerCase();
  }
  const hash = crypto.createHash("sha1").update(str).digest("hex");
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    `4${hash.slice(13, 16)}`,
    `${((parseInt(hash.slice(16, 17), 16) & 0x3) | 0x8).toString(16)}${hash.slice(17, 20)}`,
    hash.slice(20, 32)
  ].join("-");
}

function parseScores(teams: string[], scoreArray?: Array<{ r: number; w: number; o: number; inning: string }>) {
  let homeScore = 0;
  let awayScore = 0;
  if (scoreArray && scoreArray.length > 0 && teams.length >= 2) {
    const home = teams[0].toLowerCase();
    const away = teams[1].toLowerCase();
    for (const inning of scoreArray) {
      const inningText = inning.inning.toLowerCase();
      if (inningText.includes(home)) {
        homeScore = Math.max(homeScore, inning.r);
      } else if (inningText.includes(away)) {
        awayScore = Math.max(awayScore, inning.r);
      } else {
        if (inning.inning.includes("1")) {
          homeScore = inning.r;
        } else {
          awayScore = inning.r;
        }
      }
    }
  }
  return { homeScore, awayScore };
}

class CricketService {
  private cache: { data: CricMatch[]; fetchedAt: number } | null = null;
  private readonly TTL = 60_000; // 1-minute cache
  private lastSyncedAt = 0;
  private readonly SYNC_INTERVAL = 60_000; // 1-minute cache

  private async fetchAllCricAPI(endpoint: string, offset: number = 0, pages: number = 0): Promise<CricMatch[]> {
    if (!KEY) {
      throw new Error("CRICAPI_KEY is not configured in backend/.env");
    }

    // Limit to 2 pages max to prevent exhausting the free tier API limit
    if (pages >= 2) {
      return [];
    }

    console.log(`Fetching CricAPI endpoint ${endpoint} with offset ${offset}...`);
    const url = `${BASE}/${endpoint}?apikey=${KEY}&offset=${offset}`;
    const res = await fetch(url);

    if (!res.ok) {
      console.error(`CricAPI HTTP ${res.status} for ${url}`);
      return [];
    }

    const json: CricApiResponse = await res.json();

    if (json.status !== "success") {
      console.error(`CricAPI error: ${json.status}`);
      return [];
    }

    let datarray = json.data;
    if (!datarray || datarray.length === 0) {
      return [];
    } else if (offset + datarray.length >= json.info.totalRows) {
      return datarray;
    } else {
      const moreData = await this.fetchAllCricAPI(endpoint, offset + 25, pages + 1);
      return datarray.concat(moreData);
    }
  }

  async getCurrentMatches(): Promise<CricMatch[]> {
    // Return cache if still fresh
    if (this.cache && Date.now() - this.cache.fetchedAt < this.TTL) {
      return this.cache.data;
    }

    const data = await this.fetchAllCricAPI("currentMatches", 0);
    this.cache = { data, fetchedAt: Date.now() };
    return data;
  }

  async getLiveMatchSummaries(): Promise<LiveCricketMatchSummary[]> {
    const liveMatches = (await this.getCurrentMatches()).filter((match) => match.matchStarted && !match.matchEnded);

    return liveMatches
      .filter((match) => match.teams?.length >= 2)
      .map((match) => {
        const homeTeam = match.teams[0];
        const awayTeam = match.teams[1];
        const scores = parseScores(match.teams, match.score);
        const odds = this.generateOdds(match.id);

        return {
          id: toUUID(match.id),
          starts_at: new Date(match.dateTimeGMT || match.date).toISOString(),
          status: "LIVE" as const,
          home_team: homeTeam,
          away_team: awayTeam,
          league: match.name || "Cricket",
          home_score: scores.homeScore,
          away_score: scores.awayScore,
          sport_slug: "cricket" as const,
          odds: [
            { odd_id: `${toUUID(match.id)}-home`, selection_name: homeTeam, price: odds.back1 },
            { odd_id: `${toUUID(match.id)}-away`, selection_name: awayTeam, price: odds.back2 }
          ]
        };
      });
  }

  async getUpcomingMatches(): Promise<CricMatch[]> {
    const data = await this.fetchAllCricAPI("matches", 0);
    // Only return matches that haven't started yet (upcoming)
    return data.filter((m) => !m.matchStarted);
  }

  /** Generate deterministic odds from match id seed */
  generateOdds(matchId: string): { back1: number; lay1: number; back2: number; lay2: number } {
    const seed = parseInt(matchId.replace(/-/g, "").slice(0, 8), 16) % 100;
    const base1 = 1.5 + (seed % 20) / 20;   // 1.50 – 2.50
    const base2 = 1.5 + ((seed + 13) % 20) / 20;
    return {
      back1: parseFloat(base1.toFixed(2)),
      lay1:  parseFloat((base1 + 0.02).toFixed(2)),
      back2: parseFloat(base2.toFixed(2)),
      lay2:  parseFloat((base2 + 0.02).toFixed(2)),
    };
  }

  async syncMatchesToDatabase(): Promise<void> {
    if (Date.now() - this.lastSyncedAt < this.SYNC_INTERVAL) {
      return; // Already synced recently
    }

    // 1. Ensure cricket sport exists
    let sport = await db.selectFrom("sports").selectAll().where("slug", "=", "cricket").executeTakeFirst();
    if (!sport) {
      sport = await db.insertInto("sports")
        .values({ name: "Cricket", slug: "cricket", active: true })
        .returningAll()
        .executeTakeFirstOrThrow();
    }

    // 2. Ensure default league exists
    let league = await db.selectFrom("leagues").selectAll().where("sport_id", "=", sport.id).where("name", "=", "International Cricket").executeTakeFirst();
    if (!league) {
      league = await db.insertInto("leagues")
        .values({ sport_id: sport.id, name: "International Cricket", country: "World", active: true })
        .returningAll()
        .executeTakeFirstOrThrow();
    }

    // Fetch matches from CricAPI
    let matches: CricMatch[] = [];
    try {
      const current = await this.getCurrentMatches();
      matches = matches.concat(current);
    } catch (err) {
      console.error("Error fetching current matches:", err);
    }

    try {
      const upcoming = await this.getUpcomingMatches();
      matches = matches.concat(upcoming);
    } catch (err) {
      console.error("Error fetching upcoming matches:", err);
    }

    if (matches.length === 0) {
      this.lastSyncedAt = Date.now();
      return;
    }

    // Deduplicate by match ID
    const seen = new Set<string>();
    const uniqueMatches = matches.filter(m => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });

    for (const m of uniqueMatches) {
      if (!m.teams || m.teams.length < 2) continue;
      const homeName = m.teams[0];
      const awayName = m.teams[1];

      // Find or create teams
      let homeTeam = await db.selectFrom("teams").selectAll().where("sport_id", "=", sport.id).where("name", "=", homeName).executeTakeFirst();
      if (!homeTeam) {
        homeTeam = await db.insertInto("teams")
          .values({ sport_id: sport.id, name: homeName, country: homeName })
          .returningAll()
          .executeTakeFirstOrThrow();
      }

      let awayTeam = await db.selectFrom("teams").selectAll().where("sport_id", "=", sport.id).where("name", "=", awayName).executeTakeFirst();
      if (!awayTeam) {
        awayTeam = await db.insertInto("teams")
          .values({ sport_id: sport.id, name: awayName, country: awayName })
          .returningAll()
          .executeTakeFirstOrThrow();
      }

      // Map match fields
      const matchId = toUUID(m.id);
      const startsAt = new Date(m.dateTimeGMT || m.date);
      
      let status: "SCHEDULED" | "LIVE" | "FINISHED" | "CANCELLED" = "SCHEDULED";
      if (m.matchEnded) {
        status = "FINISHED";
      } else if (m.matchStarted) {
        status = "LIVE";
      }

      const { homeScore, awayScore } = parseScores(m.teams, m.score);

      // Check if match already exists
      const existingMatch = await db.selectFrom("matches").selectAll().where("id", "=", matchId).executeTakeFirst();
      if (existingMatch) {
        // Update match
        await db.updateTable("matches")
          .set({
            status,
            home_score: homeScore,
            away_score: awayScore,
            starts_at: startsAt,
            updated_at: new Date()
          })
          .where("id", "=", matchId)
          .execute();
      } else {
        // Insert match
        await db.insertInto("matches")
          .values({
            id: matchId,
            sport_id: sport.id,
            league_id: league.id,
            home_team_id: homeTeam.id,
            away_team_id: awayTeam.id,
            starts_at: startsAt,
            status,
            home_score: homeScore,
            away_score: awayScore
          })
          .execute();
      }

      // Market and Odds management
      let market = await db.selectFrom("markets").selectAll().where("match_id", "=", matchId).where("type", "=", "MATCH_WINNER").executeTakeFirst();
      const marketStatus = status === "FINISHED" ? "SETTLED" as const : "OPEN" as const;
      
      if (!market) {
        market = await db.insertInto("markets")
          .values({
            match_id: matchId,
            name: "Match Winner",
            type: "MATCH_WINNER",
            status: marketStatus
          })
          .returningAll()
          .executeTakeFirstOrThrow();
      } else {
        await db.updateTable("markets")
          .set({ status: marketStatus })
          .where("id", "=", market.id)
          .execute();
      }

      // Generate deterministic odds from original CricAPI match ID
      const odds = this.generateOdds(m.id);

      // Ensure odds entries exist
      const existingOdds = await db.selectFrom("odds").selectAll().where("market_id", "=", market.id).execute();
      const homeOdd = existingOdds.find(o => o.selection_name === homeName);
      const awayOdd = existingOdds.find(o => o.selection_name === awayName);

      const oddStatus = status === "FINISHED" ? "SUSPENDED" as const : "ACTIVE" as const;

      if (!homeOdd) {
        await db.insertInto("odds")
          .values({
            market_id: market.id,
            selection_name: homeName,
            price: odds.back1,
            status: oddStatus
          })
          .execute();
      } else {
        await db.updateTable("odds")
          .set({ price: odds.back1, status: oddStatus, updated_at: new Date() })
          .where("id", "=", homeOdd.id)
          .execute();
      }

      if (!awayOdd) {
        await db.insertInto("odds")
          .values({
            market_id: market.id,
            selection_name: awayName,
            price: odds.back2,
            status: oddStatus
          })
          .execute();
      } else {
        await db.updateTable("odds")
          .set({ price: odds.back2, status: oddStatus, updated_at: new Date() })
          .where("id", "=", awayOdd.id)
          .execute();
      }
    }

    this.lastSyncedAt = Date.now();
  }
}

export const cricketService = new CricketService();
