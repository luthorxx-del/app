import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";

let transportConfig: any;
if (!isProduction) {
  try {
    require.resolve("pino-pretty");
    transportConfig = {
      target: "pino-pretty",
      options: { colorize: true },
    };
  } catch {
    transportConfig = undefined;
  }
}

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  redact: [
    "req.headers.authorization",
    "req.headers.cookie",
    "res.headers['set-cookie']",
  ],
  ...(transportConfig ? { transport: transportConfig } : {}),
});
