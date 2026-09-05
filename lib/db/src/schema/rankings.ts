import { createInsertSchema } from "drizzle-zod";
import { date, index, integer, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";
import { playersTable } from "./players";
import { sportsTable } from "./sports";
import { z } from "zod/v4";

export const playerRankingsTable = pgTable(
  "player_rankings",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    sportId: integer("sport_id")
      .notNull()
      .references(() => sportsTable.id),
    playerId: integer("player_id")
      .notNull()
      .references(() => playersTable.id),
    rankingType: text("ranking_type").notNull().default("singles"),
    rankingDate: date("ranking_date").notNull(),
    ranking: integer("ranking").notNull(),
    points: integer("points"),
    source: text("source").notNull().default("internal"),
  },
  (table) => ({
    playerDateIndex: uniqueIndex("player_rankings_player_date_idx").on(
      table.playerId,
      table.rankingType,
      table.rankingDate,
      table.source,
    ),
    sportDateIndex: index("player_rankings_sport_date_idx").on(
      table.sportId,
      table.rankingDate,
    ),
  }),
);

export const insertPlayerRankingSchema = createInsertSchema(playerRankingsTable);
export type InsertPlayerRanking = z.infer<typeof insertPlayerRankingSchema>;
export type PlayerRanking = typeof playerRankingsTable.$inferSelect;