import { clientPromise } from "@/lib/db";

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

export const MOCK_MATCHES: Match[] = [
  {
    id: "m-1",
    homeTeam: "United States",
    awayTeam: "England",
    homeScore: 1,
    awayScore: 1,
    status: "live",
    utcDate: new Date(Date.now() - 45 * 60 * 1000).toISOString(), // started 45m ago
    minute: 48,
  },
  {
    id: "m-2",
    homeTeam: "Mexico",
    awayTeam: "Canada",
    homeScore: null,
    awayScore: null,
    status: "scheduled",
    utcDate: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // 4h from now
    minute: null,
  },
  {
    id: "m-3",
    homeTeam: "Argentina",
    awayTeam: "France",
    homeScore: null,
    awayScore: null,
    status: "scheduled",
    utcDate: new Date(Date.now() + 28 * 60 * 60 * 1000).toISOString(), // tomorrow
    minute: null,
  },
  {
    id: "m-4",
    homeTeam: "Brazil",
    awayTeam: "Germany",
    homeScore: 2,
    awayScore: 1,
    status: "finished",
    utcDate: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // finished
    minute: 90,
  },
  {
    id: "m-5",
    homeTeam: "Spain",
    awayTeam: "Italy",
    homeScore: 0,
    awayScore: 0,
    status: "finished",
    utcDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // yesterday
    minute: 90,
  },
];

export async function fetchLiveMatches(): Promise<MatchResponse> {
  try {
    const mongoClient = await clientPromise;
    const db = mongoClient.db(DB_NAME);
    const settings = await db.collection("settings").findOne({ _id: "global" as any });

    const enableRealMatchData = settings?.featureFlags?.enableRealMatchData ?? false;
    const matchApi = settings?.matchApi || {};
    const provider = matchApi.provider || "football-data";
    const apiKey = matchApi.apiKey;

    if (!enableRealMatchData || !apiKey) {
      return { matches: MOCK_MATCHES, isMock: true };
    }

    if (provider === "football-data") {
      // football-data.org provider — WC competition code is WC
      const res = await fetch("https://api.football-data.org/v4/competitions/WC/matches", {
        headers: { "X-Auth-Token": apiKey },
      });
      if (!res.ok) {
        console.warn("football-data.org API error, falling back to mock matches:", await res.text());
        return { matches: MOCK_MATCHES, isMock: true };
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
        console.warn("api-football API error, falling back to mock matches:", await res.text());
        return { matches: MOCK_MATCHES, isMock: true };
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

    return { matches: MOCK_MATCHES, isMock: true };
  } catch (error) {
    console.error("fetchLiveMatches failed, falling back to mock matches:", error);
    return { matches: MOCK_MATCHES, isMock: true };
  }
}
