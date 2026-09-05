import { createInsertSchema } from "drizzle-zod";
import { date, index, integer, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";
import { sportsTable } from "./sports";
import { z } from "zod/v4";

export const seasonsTable = pgTable(
  "seasons",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    sportId: integer("sport_id")
      .notNull()
      .references(() => sportsTable.id),
    source: text("source").notNull().default("internal"),
    externalId: text("external_id"),
    year: integer("year").notNull(),
    label: text("label").notNull(),
    startDate: date("start_date"),
    endDate: date("end_date"),
  },
  (table) => ({
    sportYearIndex: uniqueIndex("seasons_sport_year_idx").on(
      table.sportId,
      table.year,
    ),
    sourceExternalIndex: uniqueIndex("seasons_source_external_idx").on(
      table.source,
      table.externalId,
    ),
    sportIndex: index("seasons_sport_idx").on(table.sportId),
  }),
);

export const insertSeasonSchema = createInsertSchema(seasonsTable);
export type InsertSeason = z.infer<typeof insertSeasonSchema>;
export type Season = typeof seasonsTable.$inferSelect;