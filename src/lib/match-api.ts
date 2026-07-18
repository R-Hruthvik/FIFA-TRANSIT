import { clientPromise, GLOBAL_SETTINGS_ID } from "@/lib/db";

const DB_NAME = process.env.MONGODB_DB || "stadium_ops";

export interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  status: "scheduled" | "live" | "finished";
  utcDate: string;
  minute: number | null;
}

export interface MatchResponse {
  matches: Match[];
  isMock: boolean;
}

export async function fetchLiveMatches(): Promise<MatchResponse> {
  try {
    const mongoClient = await clientPromise;
    const db = mongoClient.db(DB_NAME);
    const settings = await db.collection("settings").findOne({ _id: GLOBAL_SETTINGS_ID });

    const enableRealMatchData = settings?.featureFlags?.enableRealMatchData ?? false;
    const matchApi = settings?.matchApi || {};
    const provider = matchApi.provider || "football-data";
    const apiKey = matchApi.apiKey;

    if (!enableRealMatchData || !apiKey) {
      return { matches: [], isMock: true };
    }

    if (provider === "football-data") {
      // football-data.org provider — WC competition code is WC
      const res = await fetch("https://api.football-data.org/v4/competitions/WC/matches", {
        headers: { "X-Auth-Token": apiKey },
      });
      if (!res.ok) {
        console.warn("football-data.org API error, falling back to empty matches:", await res.text());
        return { matches: [], isMock: true };
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
      return { matches: mapped, isMock: false };
    } else if (provider === "api-football") {
      // api-football provider — World Cup 2026
      const res = await fetch("https://v3.football.api-sports.io/fixtures?league=1&season=2026", {
        headers: { "x-apisports-key": apiKey },
      });
      if (!res.ok) {
        console.warn("api-football API error, falling back to empty matches:", await res.text());
        return { matches: [], isMock: true };
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
      return { matches: mapped, isMock: false };
    }

    return { matches: [], isMock: true };
  } catch (error) {
    console.error("fetchLiveMatches failed, falling back to mock matches:", error);
    return { matches: [], isMock: true };
  }
}
