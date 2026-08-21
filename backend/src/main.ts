import app from "./server.js";
import { runMigrations } from "./db/migrate.js";

const port = Number(process.env.PORT ?? 3000);

// Vor dem Serverstart das Schema auf den nötigen Stand bringen. Schlägt die
// Migration fehl (z. B. DB nicht erreichbar), startet der Server bewusst nicht.
try {
  const applied = await runMigrations();
  console.log(
    applied.length > 0
      ? `Migrationen angewendet: ${applied.join(", ")}`
      : "Datenbankschema ist aktuell – keine Migrationen nötig."
  );
} catch (err) {
  console.error("Migration beim Start fehlgeschlagen:", err);
  process.exit(1);
}

app.listen(port, () => {
  console.log(`Timeless API lauscht auf Port ${port}`);
});
