import { createInsertSchema } from "drizzle-zod";
import {
  date,
  index,
  integer,
  boolean,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  numeric,
} from "drizzle-orm/pg-core";
import { playersTable } from "./players";
import { sportsTable } from "./sports";
import { tournamentsTable } from "./tournaments";
import { z } from "zod/v4";

export const matchStatusEnum = pgEnum("match_status", [
  "upcoming",
  "live",
  "completed",
]);

export const matchesTable = pgTable(
  "matches",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    sportId: integer("sport_id")
      .notNull()
      .references(() => sportsTable.id),
    tournamentId: integer("tournament_id")
      .notNull()
      .references(() => tournamentsTable.id),
    source: text("source").notNull().default("internal"),
    externalId: text("external_id"),
    playerAId: integer("player_a_id")
      .notNull()
      .references(() => playersTable.id),
    playerBId: integer("player_b_id")
      .notNull()
      .references(() => playersTable.id),
    date: timestamp("date", { withTimezone: true }).notNull(),
    status: matchStatusEnum("status").notNull(),
    winnerId: integer("winner_id").references(() => playersTable.id),
    resultSummary: text("result_summary"),
    round: text("round"),
    bestOf: integer("best_of"),
  },
  (table) => ({
    sportDateIndex: index("matches_sport_date_idx").on(table.sportId, table.date),
    statusDateIndex: index("matches_status_date_idx").on(
      table.status,
      table.date,
    ),
    tournamentIndex: index("matches_tournament_idx").on(table.tournamentId),
    playerAIndex: index("matches_player_a_idx").on(table.playerAId),
    playerBIndex: index("matches_player_b_idx").on(table.playerBId),
    sourceExternalIndex: uniqueIndex("matches_source_external_idx").on(
      table.source,
      table.externalId,
    ),
  }),
);

export const matchSetsTable = pgTable(
  "match_sets",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    matchId: integer("match_id")
      .notNull()
      .references(() => matchesTable.id, { onDelete: "cascade" }),
    setNumber: integer("set_number").notNull(),
    playerAGames: integer("player_a_games").notNull(),
    playerBGames: integer("player_b_games").notNull(),
    playerATiebreak: integer("player_a_tiebreak"),
    playerBTiebreak: integer("player_b_tiebreak"),
    isSuperTiebreak: boolean("is_super_tiebreak").notNull().default(false),
  },
  (table) => ({
    matchSetIndex: index("match_sets_match_idx").on(
      table.matchId,
      table.setNumber,
    ),
  }),
);

export const matchResultsTable = pgTable(
  "match_results",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    matchId: integer("match_id")
      .notNull()
      .references(() => matchesTable.id, { onDelete: "cascade" }),
    winnerId: integer("winner_id").references(() => playersTable.id),
    loserId: integer("loser_id").references(() => playersTable.id),
    resultType: text("result_type").notNull().default("normal"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    durationMinutes: integer("duration_minutes"),
    finalScore: text("final_score"),
  },
  (table) => ({
    matchIndex: uniqueIndex("match_results_match_idx").on(table.matchId),
    winnerIndex: index("match_results_winner_idx").on(table.winnerId),
  }),
);

export const matchStatisticsTable = pgTable(
  "match_statistics",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    matchId: integer("match_id")
      .notNull()
      .references(() => matchesTable.id, { onDelete: "cascade" }),
    playerId: integer("player_id")
      .notNull()
      .references(() => playersTable.id),
    metric: text("metric").notNull(),
    value: numeric("value", { precision: 12, scale: 4, mode: "number" }).notNull(),
    unit: text("unit"),
    source: text("source").notNull().default("internal"),
  },
  (table) => ({
    matchPlayerIndex: index("match_statistics_match_player_idx").on(
      table.matchId,
      table.playerId,
    ),
    metricIndex: index("match_statistics_metric_idx").on(table.metric),
    uniqueMetric: uniqueIndex("match_statistics_unique_metric_idx").on(
      table.matchId,
      table.playerId,
      table.metric,
      table.source,
    ),
  }),
);

export const insertMatchSchema = createInsertSchema(matchesTable);
export const insertMatchSetSchema = createInsertSchema(matchSetsTable);
export const insertMatchResultSchema = createInsertSchema(matchResultsTable);
export const insertMatchStatisticSchema = createInsertSchema(matchStatisticsTable);
export type InsertMatch = z.infer<typeof insertMatchSchema>;
export type InsertMatchSet = z.infer<typeof insertMatchSetSchema>;
export type InsertMatchResult = z.infer<typeof insertMatchResultSchema>;
export type InsertMatchStatistic = z.infer<typeof insertMatchStatisticSchema>;
export type Match = typeof matchesTable.$inferSelect;
export type MatchSet = typeof matchSetsTable.$inferSelect;
export type MatchResult = typeof matchResultsTable.$inferSelect;
export type MatchStatistic = typeof matchStatisticsTable.$inferSelect;