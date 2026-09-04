import { createInsertSchema } from "drizzle-zod";
import {
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
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
  },
  (table) => ({
    matchSetIndex: index("match_sets_match_idx").on(
      table.matchId,
      table.setNumber,
    ),
  }),
);

export const insertMatchSchema = createInsertSchema(matchesTable);
export const insertMatchSetSchema = createInsertSchema(matchSetsTable);
export type InsertMatch = z.infer<typeof insertMatchSchema>;
export type InsertMatchSet = z.infer<typeof insertMatchSetSchema>;
export type Match = typeof matchesTable.$inferSelect;
export type MatchSet = typeof matchSetsTable.$inferSelect;