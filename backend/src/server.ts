import { createApp } from "./app.js";
import { connectDatabase } from "./config/database.js";
import { env } from "./config/env.js";

async function bootstrap(): Promise<void> {
  await connectDatabase();
  console.log("Connected to MongoDB");

  const app = createApp();

  const server = app.listen(env.PORT, () => {
    console.log(
      `Server running in ${env.NODE_ENV} mode on port ${env.PORT}`,
    );
  });

  const shutdown = (signal: string) => {
    console.log(`${signal} received — shutting down`);
    server.close(() => {
      void import("./config/database.js").then(({ disconnectDatabase }) =>
        disconnectDatabase().then(() => process.exit(0)),
      );
    });
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

bootstrap().catch((error: unknown) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
