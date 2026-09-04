import { createInsertSchema } from "drizzle-zod";
import { index, integer, pgTable, text } from "drizzle-orm/pg-core";
import { sportsTable } from "./sports";
import { z } from "zod/v4";

export const playersTable = pgTable(
  "players",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    sportId: integer("sport_id")
      .notNull()
      .references(() => sportsTable.id),
    name: text("name").notNull(),
    country: text("country").notNull(),
    currentRanking: integer("current_ranking"),
  },
  (table) => ({
    sportIndex: index("players_sport_idx").on(table.sportId),
    nameIndex: index("players_name_idx").on(table.name),
  }),
);

export const insertPlayerSchema = createInsertSchema(playersTable);
export type InsertPlayer = z.infer<typeof insertPlayerSchema>;
export type Player = typeof playersTable.$inferSelect;