import { drizzle } from "drizzle-orm/node-postgres";
import { getTableName, asc, desc } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

export let pool: pg.Pool | undefined;
export let db: any;

if (process.env.DATABASE_URL) {
  try {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    db = drizzle(pool, { schema });
  } catch (e) {
    console.warn("[AI Studio] Failed to connect to DATABASE_URL, using in-memory store:", e);
  }
}

if (!db) {
  console.warn("[AI Studio] DATABASE_URL not set — using in-memory store for SportStats");
  const dialect = new PgDialect();
  const memoryStore: Record<string, any[]> = {
    sports: [],
    players: [],
    seasons: [],
    tournaments: [],
    matches: [],
    match_sets: [],
    match_results: [],
    match_statistics: [],
    rankings: [],
  };

  function resolveTableName(target: any): string {
    if (!target) return "unknown";
    try {
      const name = getTableName(target);
      if (name) return name;
    } catch {}
    if (typeof target === "string") return target;
    return target._?.name ?? target.name ?? "unknown";
  }

  function makeMatcher(condition: any): (row: any) => boolean {
    if (!condition) return () => true;
    try {
      const { sql, params } = dialect.sqlToQuery(condition);
      return (row: any) => {
        try {
          // Check for in (...)
          const inMatch = sql.match(/"[a-zA-Z0-9_]+"\."([a-zA-Z0-9_]+)" in \(([^)]+)\)/);
          if (inMatch) {
            const col = inMatch[1];
            const camel = col.replace(/_([a-z])/g, (_: string, g: string) => g.toUpperCase());
            const val = row[camel] ?? row[col];
            return params.includes(val);
          }

          let jsExpr = sql;

          // Replace ilike first with case-insensitive includes
          jsExpr = jsExpr.replace(/"[a-zA-Z0-9_]+"\."([a-zA-Z0-9_]+)" ilike \$(\d+)/g, (_: string, col: string, idxStr: string) => {
            const camel = col.replace(/_([a-z])/g, (_: string, g: string) => g.toUpperCase());
            const paramVal = params[Number(idxStr) - 1];
            const clean = typeof paramVal === "string" ? paramVal.toLowerCase().replace(/%/g, "") : "";
            return `Boolean(String(row["${camel}"] ?? row["${col}"] ?? "").toLowerCase().includes(${JSON.stringify(clean)}))`;
          });

          // Replace date comparison: "col" < $1 or "col" > $1
          jsExpr = jsExpr.replace(/"[a-zA-Z0-9_]+"\."([a-zA-Z0-9_]+)"\s*(<|<=|>|>=)\s*\$(\d+)/g, (_: string, col: string, op: string, idxStr: string) => {
            const camel = col.replace(/_([a-z])/g, (_: string, g: string) => g.toUpperCase());
            const paramVal = params[Number(idxStr) - 1];
            const time = paramVal instanceof Date ? paramVal.getTime() : new Date(paramVal).getTime();
            return `(new Date(row["${camel}"] ?? row["${col}"]).getTime() ${op} ${time})`;
          });

          params.forEach((val: any, idx: number) => {
            const token = "$" + (idx + 1);
            if (val instanceof Date) {
              jsExpr = jsExpr.split(token).join(String(val.getTime()));
            } else {
              jsExpr = jsExpr.split(token).join(JSON.stringify(val));
            }
          });

          // Replace column names with row property lookups
          jsExpr = jsExpr.replace(/"[a-zA-Z0-9_]+"\."([a-zA-Z0-9_]+)"/g, (_: string, col: string) => {
            const camel = col.replace(/_([a-z])/g, (_: string, g: string) => g.toUpperCase());
            return `(row["${camel}"] ?? row["${col}"])`;
          });

          jsExpr = jsExpr.replace(/ is not null/gi, " != null");
          jsExpr = jsExpr.replace(/ is null/gi, " == null");
          jsExpr = jsExpr.replace(/ and /gi, " && ");
          jsExpr = jsExpr.replace(/ or /gi, " || ");
          jsExpr = jsExpr.replace(/ = /g, " === ");

          return Boolean(new Function("row", "return " + jsExpr)(row));
        } catch {
          return true;
        }
      };
    } catch {
      return () => true;
    }
  }

  function formatMatchRow(match: any): any {
    const tournament = memoryStore.tournaments.find((t) => t.id === match.tournamentId);
    const pA = memoryStore.players.find((p) => p.id === match.playerAId);
    const pB = memoryStore.players.find((p) => p.id === match.playerBId);

    return {
      ...match,
      date: match.date instanceof Date ? match.date : new Date(match.date),
      tournamentName: tournament?.name ?? "Tournament",
      surface: tournament?.surface ?? "Hard",
      playerA: pA
        ? {
            id: pA.id,
            sportId: pA.sportId,
            name: pA.name,
            country: pA.country,
            currentRanking: pA.currentRanking,
          }
        : { id: match.playerAId, sportId: match.sportId, name: "Player A", country: "", currentRanking: 0 },
      playerB: pB
        ? {
            id: pB.id,
            sportId: pB.sportId,
            name: pB.name,
            country: pB.country,
            currentRanking: pB.currentRanking,
          }
        : { id: match.playerBId, sportId: match.sportId, name: "Player B", country: "", currentRanking: 0 },
    };
  }

  const createQueryChain = (fields?: any) => {
    let targetTable: any = null;
    let condition: any = null;
    let limitCount: number | undefined;
    const joins: any[] = [];
    let isGroupBy = false;

    const chain: any = {
      from: (t: any) => {
        targetTable = t;
        return chain;
      },
      innerJoin: (t: any, on: any) => {
        joins.push({ table: t, on });
        return chain;
      },
      leftJoin: (t: any, on: any) => {
        joins.push({ table: t, on });
        return chain;
      },
      where: (cond: any) => {
        condition = cond;
        return chain;
      },
      orderBy: () => chain,
      groupBy: () => {
        isGroupBy = true;
        return chain;
      },
      limit: (n: number) => {
        limitCount = n;
        return chain;
      },
      offset: () => chain,
      then: (resolve: any, reject: any) => {
        try {
          const tableName = resolveTableName(targetTable);
          let rawRows = (memoryStore[tableName] || []).slice();

          // If querying matchesTable, format with joined players and tournaments
          if (tableName === "matches") {
            rawRows = rawRows.map(formatMatchRow);

            // Special case: calculateHeadToHead surfaceRows
            if (fields && typeof fields === "object" && "surface" in fields && "totalMeetings" in fields) {
              const matcher = makeMatcher(condition);
              const filtered = rawRows.filter(matcher);
              const surfaceGroups: Record<string, { totalMeetings: number; playerAWins: number; playerBWins: number }> = {};
              for (const m of filtered) {
                const s = m.surface || "Hard";
                if (!surfaceGroups[s]) {
                  surfaceGroups[s] = { totalMeetings: 0, playerAWins: 0, playerBWins: 0 };
                }
                surfaceGroups[s].totalMeetings += 1;
                if (m.winnerId === m.playerAId) surfaceGroups[s].playerAWins += 1;
                if (m.winnerId === m.playerBId) surfaceGroups[s].playerBWins += 1;
              }
              const res = Object.entries(surfaceGroups).map(([surface, data]) => ({
                surface,
                ...data,
              }));
              return Promise.resolve(res).then(resolve, reject);
            }
          }

          const matcher = makeMatcher(condition);
          let result = rawRows.filter(matcher);

          if (limitCount !== undefined) {
            result = result.slice(0, limitCount);
          }

          return Promise.resolve(result).then(resolve, reject);
        } catch (err) {
          return Promise.resolve([]).then(resolve, reject);
        }
      },
      catch: (reject: any) => chain.then((r: any) => r, reject),
    };

    return chain;
  };

  db = {
    transaction: async (fn: any) => fn(db),
    select: (fields?: any) => createQueryChain(fields),
    selectDistinct: (fields?: any) => createQueryChain(fields),
    insert: (table: any) => {
      const tableName = resolveTableName(table);
      return {
        values: (rawVals: any) => {
          const items = Array.isArray(rawVals) ? rawVals : [rawVals];
          if (!memoryStore[tableName]) memoryStore[tableName] = [];
          const inserted: any[] = [];
          for (const item of items) {
            const id = item.id ?? memoryStore[tableName].length + 1;
            const row = {
              ...item,
              id,
              date: item.date instanceof Date ? item.date : item.date ? new Date(item.date) : undefined,
            };
            memoryStore[tableName].push(row);
            inserted.push(row);
          }
          const p: any = Promise.resolve(inserted);
          p.returning = () => Promise.resolve(inserted);
          p.onConflictDoNothing = () => p;
          p.onConflictDoUpdate = () => p;
          p.then = (res: any, rej: any) => Promise.resolve(inserted).then(res, rej);
          p.catch = (rej: any) => Promise.resolve(inserted).catch(rej);
          return p;
        },
      };
    },
    update: (table: any) => ({
      set: () => ({
        where: () => Promise.resolve([]),
      }),
    }),
    delete: (table: any) => ({
      where: () => Promise.resolve([]),
    }),
    execute: async () => [],
    $count: async () => 0,
    query: new Proxy(
      {},
      {
        get: () => ({
          findMany: async () => [],
          findFirst: async () => null,
          findUnique: async () => null,
        }),
      },
    ),
  };
}

export * from "./schema";
