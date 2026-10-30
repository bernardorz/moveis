import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL não definida");

// O pooler do Supabase (modo transaction) não suporta prepared statements.
const isPooler = /:6543\b|pooler\.supabase\.com/.test(url);

const globalForDb = globalThis as unknown as { pgClient?: postgres.Sql };

const client = globalForDb.pgClient ?? postgres(url, { prepare: !isPooler, max: 10 });
if (process.env.NODE_ENV !== "production") globalForDb.pgClient = client;

export const db = drizzle(client, { schema, casing: "snake_case" });

export type Database = typeof db;
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
