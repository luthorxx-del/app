---
name: Sports data integrity
description: Rules for importing sports records and calculating historical context without leakage.
---

Treat `source + externalId` as the durable identity for imported players, seasons, tournaments, and matches. Keep H2H, form, and other historical context derived from completed match records rather than storing aggregates as the source of truth.

**Why:** Provider feeds can be reprocessed, merged, or corrected. Stable provider identity prevents duplicates, while time-bounded derivation prevents future results from influencing historical or upcoming match context.

**How to apply:** Require a provider identifier in future ingestion code, upsert reference entities by that identity, and filter all pre-match statistics with a strict scheduled-time boundary.