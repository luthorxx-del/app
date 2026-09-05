import { and, asc, desc, eq, ilike, inArray, lt, or, sql, type SQL } from "drizzle-orm";
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

async function fetchMatchById(id: number) {
  const [row] = await db
    .select(baseMatchFields)
    .from(matchesTable)
    .innerJoin(
      tournamentsTable,
      eq(matchesTable.tournamentId, tournamentsTable.id),
    )
    .innerJoin(playerAAlias, eq(matchesTable.playerAId, playerAAlias.id))
    .innerJoin(playerBAlias, eq(matchesTable.playerBId, playerBAlias.id))
    .where(eq(matchesTable.id, id))
    .limit(1);

  if (!row) return undefined;

  const sets = await db
    .select()
    .from(matchSetsTable)
    .where(eq(matchSetsTable.matchId, row.id))
    .orderBy(asc(matchSetsTable.setNumber));

  return { ...row, sets };
}

type H2HTarget = {
  sportId: number;
  playerAId: number;
  playerBId: number;
  date: Date;
};

function winPercentage(wins: number, total: number) {
  return total ? Math.round((wins / total) * 1000) / 10 : 0;
}

function h2hPairCondition(match: H2HTarget) {
  return or(
    and(
      eq(matchesTable.playerAId, match.playerAId),
      eq(matchesTable.playerBId, match.playerBId),
    ),
    and(
      eq(matchesTable.playerAId, match.playerBId),
      eq(matchesTable.playerBId, match.playerAId),
    ),
  )!;
}

async function calculateHeadToHead(match: H2HTarget) {
  const priorMatchFilter = and(
    eq(matchesTable.sportId, match.sportId),
    eq(matchesTable.status, "completed"),
    lt(matchesTable.date, match.date),
    h2hPairCondition(match),
  );

  const surfaceRows = await db
    .select({
      surface: tournamentsTable.surface,
      totalMeetings: sql<number>`count(*)::int`,
      playerAWins: sql<number>`count(*) filter (where ${matchesTable.winnerId} = ${match.playerAId})::int`,
      playerBWins: sql<number>`count(*) filter (where ${matchesTable.winnerId} = ${match.playerBId})::int`,
    })
    .from(matchesTable)
    .innerJoin(
      tournamentsTable,
      eq(matchesTable.tournamentId, tournamentsTable.id),
    )
    .where(priorMatchFilter)
    .groupBy(tournamentsTable.surface)
    .orderBy(asc(tournamentsTable.surface));

  const recentMeetings = await db
    .select({
      id: matchesTable.id,
      date: matchesTable.date,
      tournamentName: tournamentsTable.name,
      surface: tournamentsTable.surface,
      playerAId: matchesTable.playerAId,
      playerBId: matchesTable.playerBId,
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
    })
    .from(matchesTable)
    .innerJoin(
      tournamentsTable,
      eq(matchesTable.tournamentId, tournamentsTable.id),
    )
    .innerJoin(playerAAlias, eq(matchesTable.playerAId, playerAAlias.id))
    .innerJoin(playerBAlias, eq(matchesTable.playerBId, playerBAlias.id))
    .where(priorMatchFilter)
    .orderBy(desc(matchesTable.date), desc(matchesTable.id))
    .limit(10);

  const totalMeetings = surfaceRows.reduce(
    (total, surface) => total + surface.totalMeetings,
    0,
  );
  const playerAWins = surfaceRows.reduce(
    (total, surface) => total + surface.playerAWins,
    0,
  );
  const playerBWins = surfaceRows.reduce(
    (total, surface) => total + surface.playerBWins,
    0,
  );

  return {
    totalMeetings,
    matchesBeforeScheduledTime: totalMeetings,
    playerAWins,
    playerBWins,
    playerAWinPercentage: winPercentage(playerAWins, totalMeetings),
    playerBWinPercentage: winPercentage(playerBWins, totalMeetings),
    surfaceBreakdown: surfaceRows.map((surface) => ({
      ...surface,
      playerAWinPercentage: winPercentage(
        surface.playerAWins,
        surface.totalMeetings,
      ),
      playerBWinPercentage: winPercentage(
        surface.playerBWins,
        surface.totalMeetings,
      ),
    })),
    recentMeetings,
  };
}

async function getMatchDetail(id: number) {
  const match = await fetchMatchById(id);
  if (!match) return undefined;

  const [tournament] = await db
    .select()
    .from(tournamentsTable)
    .where(eq(tournamentsTable.id, match.tournamentId));
  if (!tournament) return undefined;

  const headToHead = await calculateHeadToHead({
    sportId: match.sportId,
    playerAId: match.playerA.id,
    playerBId: match.playerB.id,
    date: match.date,
  });

  return { ...match, tournament, headToHead };
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

  const detail = await getMatchDetail(parsed.data.id);
  if (!detail) {
    res.status(404).json({ error: "Match not found" });
    return;
  }

  res.json(GetMatchResponse.parse(detail));
});

router.get("/matches/:id/h2h", async (req, res): Promise<void> => {
  const parsed = GetMatchParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const detail = await getMatchDetail(parsed.data.id);
  if (!detail) {
    res.status(404).json({ error: "Match not found" });
    return;
  }

  res.json(detail.headToHead);
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