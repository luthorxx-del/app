---
name: OpenAPI and workspace Zod compatibility
description: Compatibility constraint between Orval's generated Zod schemas and the workspace dependency version.
---

When adding OpenAPI schemas in this workspace, prefer `type: number` for numeric API fields unless the workspace Zod catalog has been upgraded to a version that supports the generated `z.int()` helper.

**Why:** Orval currently emits `z.int()` for OpenAPI `integer`, while the workspace uses Zod 3, which does not expose that helper. Code generation succeeds but the library typecheck fails.

**How to apply:** Check the workspace catalog before changing numeric OpenAPI types; if Zod remains on the current major, use `number` plus `minimum` constraints and keep integer enforcement in the database and route validation.