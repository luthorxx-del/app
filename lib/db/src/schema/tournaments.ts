import { createInsertSchema } from "drizzle-zod";
import { index, integer, pgTable, text } from "drizzle-orm/pg-core";
import { sportsTable } from "./sports";
import { z } from "zod/v4";

export const tournamentsTable = pgTable(
  "tournaments",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    sportId: integer("sport_id")
      .notNull()
      .references(() => sportsTable.id),
    name: text("name").notNull(),
    region: text("region").notNull(),
    surface: text("surface").notNull(),
    category: text("category").notNull(),
    season: integer("season").notNull(),
  },
  (table) => ({
    sportIndex: index("tournaments_sport_idx").on(table.sportId),
    nameIndex: index("tournaments_name_idx").on(table.name),
  }),
);

export const insertTournamentSchema = createInsertSchema(tournamentsTable);
export type InsertTournament = z.infer<typeof insertTournamentSchema>;
export type Tournament = typeof tournamentsTable.$inferSelect;