import { createInsertSchema } from "drizzle-zod";
import { index, integer, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";
import { sportsTable } from "./sports";
import { seasonsTable } from "./seasons";
import { z } from "zod/v4";

export const tournamentsTable = pgTable(
  "tournaments",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    sportId: integer("sport_id")
      .notNull()
      .references(() => sportsTable.id),
    seasonId: integer("season_id").references(() => seasonsTable.id),
    source: text("source").notNull().default("internal"),
    externalId: text("external_id"),
    name: text("name").notNull(),
    region: text("region").notNull(),
    surface: text("surface").notNull(),
    category: text("category").notNull(),
    season: integer("season").notNull(),
  },
  (table) => ({
    sportIndex: index("tournaments_sport_idx").on(table.sportId),
    nameIndex: index("tournaments_name_idx").on(table.name),
    seasonIndex: index("tournaments_season_idx").on(table.seasonId),
    sourceExternalIndex: uniqueIndex("tournaments_source_external_idx").on(
      table.source,
      table.externalId,
    ),
  }),
);

export const insertTournamentSchema = createInsertSchema(tournamentsTable);
export type InsertTournament = z.infer<typeof insertTournamentSchema>;
export type Tournament = typeof tournamentsTable.$inferSelect;