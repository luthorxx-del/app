import { and, asc, eq, ilike, inArray, or, type SQL } from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  GetDashboardQueryParams,
  GetDashboardResponse,
  GetMatchParams,
  GetMatchResponse,
  GetPlayerParams,
  GetPlayerResponse,
  GetTournamentParams,
  GetTournamentResponse,
  ListMatchesQueryParams,
  ListMatchesResponse,
  ListSportsResponse,
  SearchQueryParams,
  SearchResponse,
} from "@workspace/api-zod";
import {
  db,
  matchSetsTable,
  matchesTable,
  playersTable,
  sportsTable,
  tournamentsTable,
} from "@workspace/db";
import { alias } from "drizzle-orm/pg-core";

const router: IRouter = Router();
const playerAAlias = alias(playersTable, "player_a");
const playerBAlias = alias(playersTable, "player_b");

type MatchFilters = {
  sportId?: number;
  tournamentId?: number;
  playerId?: number;
  status?: "upcoming" | "live" | "completed";
};

const baseMatchFields = {
  id: matchesTable.id,
  sportId: matchesTable.sportId,
  tournamentId: matchesTable.tournamentId,
  tournamentName: tournamentsTable.name,
  date: matchesTable.date,
  status: matchesTable.status,
  winnerId: matchesTable.winnerId,
  resultSummary: matchesTable.resultSummary,
  playerA: {
    id: playerAAlias.id,
    sportId: playerAAlias.sportId,
    name: playerAAlias.name,
    country: playerAAlias.country,
    currentRanking: playerAAlias.currentRanking,
  },
  playerB: {
    id: playerBAlias.id,
    sportId: playerBAlias.sportId,
    name: playerBAlias.name,
    country: playerBAlias.country,
    currentRanking: playerBAlias.currentRanking,
  },
};

async function fetchMatches(filters: MatchFilters = {}) {
  const conditions: SQL[] = [];
  if (filters.sportId !== undefined) {
    conditions.push(eq(matchesTable.sportId, filters.sportId));
  }
  if (filters.tournamentId !== undefined) {
    conditions.push(eq(matchesTable.tournamentId, filters.tournamentId));
  }
  if (filters.playerId !== undefined) {
    conditions.push(
      or(
        eq(matchesTable.playerAId, filters.playerId),
        eq(matchesTable.playerBId, filters.playerId),
      )!,
    );
  }
  if (filters.status !== undefined) {
    conditions.push(eq(matchesTable.status, filters.status));
  }

  const rows = await db
    .select(baseMatchFields)
    .from(matchesTable)
    .innerJoin(
      tournamentsTable,
      eq(matchesTable.tournamentId, tournamentsTable.id),
    )
    .innerJoin(playerAAlias, eq(matchesTable.playerAId, playerAAlias.id))
    .innerJoin(playerBAlias, eq(matchesTable.playerBId, playerBAlias.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(matchesTable.date));

  const matchIds = rows.map((row) => row.id);
  const sets = matchIds.length
    ? await db
        .select()
        .from(matchSetsTable)
        .where(inArray(matchSetsTable.matchId, matchIds))
        .orderBy(asc(matchSetsTable.setNumber))
    : [];

  return rows.map((row) => ({
    ...row,
    sets: sets.filter((set) => set.matchId === row.id),
  }));
}

function dayBounds() {
  const now = new Date();
  const start = new Date(now);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

router.get("/sports", async (_req, res): Promise<void> => {
  const sports = await db.select().from(sportsTable).orderBy(asc(sportsTable.id));
  res.json(ListSportsResponse.parse(sports));
});

router.get("/dashboard", async (req, res): Promise<void> => {
  const parsed = GetDashboardQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [sport] = await db
    .select()
    .from(sportsTable)
    .where(
      parsed.data.sportId
        ? eq(sportsTable.id, parsed.data.sportId)
        : eq(sportsTable.name, "Tennis"),
    );

  if (!sport) {
    res.status(404).json({ error: "Sport not found" });
    return;
  }

  const { start, end } = dayBounds();
  const today = await fetchMatches({ sportId: sport.id });
  const todaysMatches = today.filter(
    (match) => match.date >= start && match.date < end,
  );
  const completed = (await fetchMatches({
    sportId: sport.id,
    status: "completed",
  })).slice(-6).reverse();

  res.json(
    GetDashboardResponse.parse({
      sport,
      today: todaysMatches,
      live: todaysMatches.filter((match) => match.status === "live"),
      upcoming: todaysMatches.filter((match) => match.status === "upcoming"),
      completed,
    }),
  );
});

router.get("/matches", async (req, res): Promise<void> => {
  const parsed = ListMatchesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const matches = await fetchMatches(parsed.data);
  res.json(ListMatchesResponse.parse(matches));
});

router.get("/matches/:id", async (req, res): Promise<void> => {
  const parsed = GetMatchParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [match] = await fetchMatches({}).then((matches) =>
    matches.filter((item) => item.id === parsed.data.id),
  );
  if (!match) {
    res.status(404).json({ error: "Match not found" });
    return;
  }

  const [tournament] = await db
    .select()
    .from(tournamentsTable)
    .where(eq(tournamentsTable.id, match.tournamentId));
  if (!tournament) {
    res.status(404).json({ error: "Tournament not found" });
    return;
  }

  res.json(GetMatchResponse.parse({ ...match, tournament }));
});

router.get("/players/:id", async (req, res): Promise<void> => {
  const parsed = GetPlayerParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [player] = await db
    .select()
    .from(playersTable)
    .where(eq(playersTable.id, parsed.data.id));
  if (!player) {
    res.status(404).json({ error: "Player not found" });
    return;
  }

  const recentMatches = await fetchMatches({
    playerId: player.id,
    sportId: player.sportId,
  });
  const completed = recentMatches.filter(
    (match) => match.status === "completed",
  );
  const wins = completed.filter((match) => match.winnerId === player.id).length;
  const losses = completed.length - wins;

  res.json(
    GetPlayerResponse.parse({
      player,
      recentMatches: recentMatches.slice(-10).reverse(),
      wins,
      losses,
      winPercentage: completed.length
        ? Math.round((wins / completed.length) * 1000) / 10
        : 0,
    }),
  );
});

router.get("/tournaments/:id", async (req, res): Promise<void> => {
  const parsed = GetTournamentParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [tournament] = await db
    .select()
    .from(tournamentsTable)
    .where(eq(tournamentsTable.id, parsed.data.id));
  if (!tournament) {
    res.status(404).json({ error: "Tournament not found" });
    return;
  }

  const matches = await fetchMatches({ tournamentId: tournament.id });
  res.json(
    GetTournamentResponse.parse({
      tournament,
      upcomingMatches: matches.filter((match) => match.status !== "completed"),
      completedMatches: matches.filter((match) => match.status === "completed"),
    }),
  );
});

router.get("/search", async (req, res): Promise<void> => {
  const parsed = SearchQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const query = `%${parsed.data.q}%`;
  const sportCondition = parsed.data.sportId
    ? eq(playersTable.sportId, parsed.data.sportId)
    : undefined;
  const tournamentSportCondition = parsed.data.sportId
    ? eq(tournamentsTable.sportId, parsed.data.sportId)
    : undefined;

  const [players, tournaments] = await Promise.all([
    db
      .select()
      .from(playersTable)
      .where(
        sportCondition
          ? and(sportCondition, ilike(playersTable.name, query))
          : ilike(playersTable.name, query),
      )
      .limit(12),
    db
      .select()
      .from(tournamentsTable)
      .where(
        tournamentSportCondition
          ? and(tournamentSportCondition, ilike(tournamentsTable.name, query))
          : ilike(tournamentsTable.name, query),
      )
      .limit(12),
  ]);

  const matches = await fetchMatches(
    parsed.data.sportId ? { sportId: parsed.data.sportId } : {},
  );
  const matchingMatches = matches
    .filter(
      (match) =>
        match.tournamentName.toLowerCase().includes(parsed.data.q.toLowerCase()) ||
        match.playerA.name.toLowerCase().includes(parsed.data.q.toLowerCase()) ||
        match.playerB.name.toLowerCase().includes(parsed.data.q.toLowerCase()),
    )
    .slice(0, 12);

  res.json(SearchResponse.parse({ players, tournaments, matches: matchingMatches }));
});

export default router;