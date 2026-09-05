import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import apiApp from "./artifacts/api-server/src/app";
import { seedSportStats } from "./artifacts/api-server/src/lib/seed";

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);

  try {
    await seedSportStats();
  } catch (err) {
    console.warn("[AI Studio] SportStats seed skipped or offline:", err);
  }

  // Mount API server handlers
  app.use(apiApp);

  // Development: Vite middleware; Production: serve static build
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      configFile: path.resolve(process.cwd(), "artifacts/sportstats/vite.config.ts"),
      server: { middlewareMode: true, host: "0.0.0.0" },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), "artifacts/sportstats/dist/public");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
