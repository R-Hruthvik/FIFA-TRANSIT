import { clientPromise, GLOBAL_SETTINGS_ID } from "@/lib/db";

const DB_NAME = process.env.MONGODB_DB || "stadium_ops";
const ENV_API_KEY = process.env.MATCH_API_KEY || process.env.FOOTBALL_DATA_API_KEY;

export interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  status: "scheduled" | "live" | "finished";
  utcDate: string;
  minute: number | null;
  stadiumName?: string | null;
}

export interface MatchResponse {
  matches: Match[];
}

export async function fetchLiveMatches(): Promise<MatchResponse> {
  const mongoClient = await clientPromise;
  const db = mongoClient.db(DB_NAME);
  const settings = await db.collection("settings").findOne({ _id: GLOBAL_SETTINGS_ID });

  const matchApi = settings?.matchApi || {};
  const provider = matchApi.provider || "football-data";
  const apiKey = matchApi.apiKey || ENV_API_KEY;

  if (!apiKey) {
    return { matches: [] };
  }

  if (provider === "football-data") {
    const res = await fetch("https://api.football-data.org/v4/competitions/WC/matches", {
      headers: { "X-Auth-Token": apiKey },
    });
    if (!res.ok) {
      throw new Error(`football-data.org API error: ${res.status} ${await res.text()}`);
    }
    const data = await res.json();
    const matches = data.matches || [];
    const mapped = matches.map((m: any) => {
      let status: Match["status"] = "scheduled";
      if (m.status === "IN_PLAY" || m.status === "PAUSED") status = "live";
      if (m.status === "FINISHED" || m.status === "AWARDED") status = "finished";

      return {
        id: String(m.id),
        homeTeam: m.homeTeam?.name || "TBD",
        awayTeam: m.awayTeam?.name || "TBD",
        homeScore: m.score?.fullTime?.home ?? null,
        awayScore: m.score?.fullTime?.away ?? null,
        status,
        utcDate: m.utcDate,
        minute: status === "live" ? (m.minute ?? null) : null,
      };
    });
    return { matches: mapped };
  }

  if (provider === "api-football") {
    const res = await fetch("https://v3.football.api-sports.io/fixtures?league=1&season=2026", {
      headers: { "x-apisports-key": apiKey },
    });
    if (!res.ok) {
      throw new Error(`api-football API error: ${res.status} ${await res.text()}`);
    }
    const data = await res.json();
    const fixtures = data.response || [];
    const mapped = fixtures.map((f: any) => {
      const shortStatus = f.fixture?.status?.short;
      let status: Match["status"] = "scheduled";
      if (["1H", "2H", "HT", "ET", "BT", "P"].includes(shortStatus)) status = "live";
      if (["FT", "AET", "PEN"].includes(shortStatus)) status = "finished";

      return {
        id: String(f.fixture?.id),
        homeTeam: f.teams?.home?.name || "TBD",
        awayTeam: f.teams?.away?.name || "TBD",
        homeScore: f.goals?.home ?? null,
        awayScore: f.goals?.away ?? null,
        status,
        utcDate: f.fixture?.date,
        minute: f.fixture?.status?.elapsed ?? null,
      };
    });
    return { matches: mapped };
  }

  return { matches: [] };
}
