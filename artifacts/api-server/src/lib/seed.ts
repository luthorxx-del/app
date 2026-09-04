import { and, eq } from "drizzle-orm";
import {
  db,
  matchSetsTable,
  matchesTable,
  playersTable,
  sportsTable,
  tournamentsTable,
} from "@workspace/db";
import { logger } from "./logger";

function addHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function atUtcHour(date: Date, hour: number) {
  const result = new Date(date);
  result.setUTCHours(hour, 0, 0, 0);
  return result;
}

export async function seedSportStats() {
  const [tennis] = await db
    .select()
    .from(sportsTable)
    .where(eq(sportsTable.name, "Tennis"));

  const [existingMatch] = await db.select().from(matchesTable).limit(1);
  if (existingMatch) {
    return;
  }

  const sport =
    tennis ??
    (
      await db
        .insert(sportsTable)
        .values({ name: "Tennis" })
        .returning()
    )[0];

  if (!sport) {
    throw new Error("Unable to initialize Tennis sport");
  }

  const players = await db
    .insert(playersTable)
    .values([
      { sportId: sport.id, name: "Jannik Sinner", country: "ITA", currentRanking: 1 },
      { sportId: sport.id, name: "Carlos Alcaraz", country: "ESP", currentRanking: 2 },
      { sportId: sport.id, name: "Alexander Zverev", country: "GER", currentRanking: 3 },
      { sportId: sport.id, name: "Novak Djokovic", country: "SRB", currentRanking: 4 },
      { sportId: sport.id, name: "Coco Gauff", country: "USA", currentRanking: 5 },
      { sportId: sport.id, name: "Iga Swiatek", country: "POL", currentRanking: 6 },
      { sportId: sport.id, name: "Aryna Sabalenka", country: "BLR", currentRanking: 7 },
      { sportId: sport.id, name: "Naomi Osaka", country: "JPN", currentRanking: 8 },
    ])
    .returning();

  const [northshore, capital] = await db
    .insert(tournamentsTable)
    .values([
      {
        sportId: sport.id,
        name: "Northshore Open",
        region: "United States",
        surface: "Hard",
        category: "ATP 500",
        season: 2026,
      },
      {
        sportId: sport.id,
        name: "Capital Classic",
        region: "Europe",
        surface: "Clay",
        category: "WTA 1000",
        season: 2026,
      },
    ])
    .returning();

  if (!northshore || !capital || players.length < 8) {
    throw new Error("Unable to seed SportStats reference data");
  }

  const [
    sinner,
    alcaraz,
    zverev,
    djokovic,
    gauff,
    swiatek,
    sabalenka,
    osaka,
  ] = players;
  const now = new Date();
  const matches = [
    {
      sportId: sport.id,
      tournamentId: northshore.id,
      playerAId: sinner.id,
      playerBId: zverev.id,
      date: atUtcHour(addDays(now, -2), 18),
      status: "completed" as const,
      winnerId: sinner.id,
      resultSummary: "6–4, 3–6, 6–2",
      sets: [
        [6, 4],
        [3, 6],
        [6, 2],
      ],
    },
    {
      sportId: sport.id,
      tournamentId: capital.id,
      playerAId: swiatek.id,
      playerBId: osaka.id,
      date: atUtcHour(addDays(now, -1), 15),
      status: "completed" as const,
      winnerId: swiatek.id,
      resultSummary: "6–2, 6–4",
      sets: [
        [6, 2],
        [6, 4],
      ],
    },
    {
      sportId: sport.id,
      tournamentId: northshore.id,
      playerAId: alcaraz.id,
      playerBId: djokovic.id,
      date: addHours(now, -0.5),
      status: "live" as const,
      winnerId: null,
      resultSummary: "6–4, 3–4",
      sets: [
        [6, 4],
        [3, 4],
      ],
    },
    {
      sportId: sport.id,
      tournamentId: northshore.id,
      playerAId: sinner.id,
      playerBId: alcaraz.id,
      date: addHours(now, 2),
      status: "upcoming" as const,
      winnerId: null,
      resultSummary: null,
      sets: [],
    },
    {
      sportId: sport.id,
      tournamentId: capital.id,
      playerAId: gauff.id,
      playerBId: sabalenka.id,
      date: addHours(now, 5),
      status: "upcoming" as const,
      winnerId: null,
      resultSummary: null,
      sets: [],
    },
    {
      sportId: sport.id,
      tournamentId: capital.id,
      playerAId: osaka.id,
      playerBId: gauff.id,
      date: addHours(addDays(now, 1), 3),
      status: "upcoming" as const,
      winnerId: null,
      resultSummary: null,
      sets: [],
    },
  ];

  await db.transaction(async (tx) => {
    for (const match of matches) {
      const [created] = await tx
        .insert(matchesTable)
        .values({
          sportId: match.sportId,
          tournamentId: match.tournamentId,
          playerAId: match.playerAId,
          playerBId: match.playerBId,
          date: match.date,
          status: match.status,
          winnerId: match.winnerId,
          resultSummary: match.resultSummary,
        })
        .returning({ id: matchesTable.id });

      if (created && match.sets.length) {
        await tx.insert(matchSetsTable).values(
          match.sets.map(([playerAGames, playerBGames], index) => ({
            matchId: created.id,
            setNumber: index + 1,
            playerAGames,
            playerBGames,
          })),
        );
      }
    }
  });

  logger.info(
    { players: players.length, tournaments: 2, matches: matches.length },
    "SportStats sample data seeded",
  );
}