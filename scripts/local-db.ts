import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

export async function startLocalDatabase(directory: string, port = 5433) {
  const database = await PGlite.create(directory);
  // One application pool connection plus one out-of-band admin/test connection.
  // The documented multiplexer queues other handlers during an open transaction.
  const server = new PGLiteSocketServer({ db: database, host: "127.0.0.1", port, inspect: false, maxConnections: 2 });
  try {
    await database.exec('CREATE TABLE IF NOT EXISTS "_streamlab_local_migrations" (name TEXT PRIMARY KEY, checksum TEXT NOT NULL)');
    const migrationsPath = path.join(process.cwd(), "prisma", "migrations");
    const migrations = (await readdir(migrationsPath, { withFileTypes: true })).filter((entry) => entry.isDirectory()).sort((a, b) => a.name.localeCompare(b.name));
    for (const migration of migrations) {
      const sql = await readFile(path.join(migrationsPath, migration.name, "migration.sql"), "utf8");
      const checksum = createHash("sha256").update(sql.replaceAll("\r\n", "\n")).digest("hex");
      const existing = await database.query<{ checksum: string }>('SELECT checksum FROM "_streamlab_local_migrations" WHERE name = $1', [migration.name]);
      if (existing.rows.length) {
        if (existing.rows[0].checksum !== checksum) throw new Error("An applied local migration changed. Restore it or create a new migration; no database data was deleted.");
        continue;
      }
      await database.transaction(async (transaction) => {
        await transaction.exec(sql);
        await transaction.query('INSERT INTO "_streamlab_local_migrations" (name, checksum) VALUES ($1, $2)', [migration.name, checksum]);
      });
    }
    await server.start();
    return { database, server, url: `postgresql://postgres@127.0.0.1:${port}/postgres?sslmode=disable`, async close() { await server.stop(); await database.close(); } };
  } catch (error) { await database.close(); throw error; }
}