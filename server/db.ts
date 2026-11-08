import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { InsertInterestRegistration, interestRegistrations } from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;
let _sqlClient: ReturnType<typeof postgres> | null = null;

// Allows injecting a mock db instance for automated unit testing without connecting to a live database
export function setDbForTesting(mockDb: ReturnType<typeof drizzle> | null) {
  _db = mockDb;
}

// Lazily create the drizzle instance so local tooling can run without a DB.
// Compatible with both direct connection and Supabase Supavisor connection pooler (port 6543).
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _sqlClient = postgres(process.env.DATABASE_URL, {
        prepare: false, // Mandatory for Supavisor transaction pooler
        max: Number(process.env.DB_MAX_CONNECTIONS || 10),
        connect_timeout: 10,
        idle_timeout: 30,
      });
      _db = drizzle(_sqlClient);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
      _sqlClient = null;
    }
  }
  return _db;
}

/**
 * Validates actual database connectivity (e.g. during health checks or startup verification).
 */
export async function testDatabaseConnection(): Promise<{ ok: boolean; latencyMs?: number; error?: string }> {
  const start = Date.now();
  try {
    const db = await getDb();
    if (!db || !_sqlClient) {
      return { ok: false, error: "Database not configured or missing DATABASE_URL" };
    }
    await _sqlClient`SELECT 1`;
    return { ok: true, latencyMs: Date.now() - start };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Gracefully terminates the PostgreSQL connection pool during server shutdown.
 */
export async function closeDb(): Promise<void> {
  if (_sqlClient) {
    try {
      await _sqlClient.end({ timeout: 5 });
    } catch (error) {
      console.warn("[Database] Error closing connection pool:", error);
    } finally {
      _sqlClient = null;
      _db = null;
    }
  }
}

export async function getInterestRegistrationByEmail(email: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");

  const result = await db.select().from(interestRegistrations).where(eq(interestRegistrations.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createInterestRegistration(email: string): Promise<{ isNew: boolean; registration: Awaited<ReturnType<typeof getInterestRegistrationByEmail>> }> {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");

  try {
    const values: InsertInterestRegistration = { email, consentedAt: new Date() };

    // Atomically insert on PostgreSQL. On conflict (duplicate email), do nothing.
    const inserted = await db
      .insert(interestRegistrations)
      .values(values)
      .onConflictDoNothing({ target: interestRegistrations.email })
      .returning();

    if (inserted.length > 0) {
      return { isNew: true, registration: inserted[0] };
    }

    // Record already exists: retrieve existing registration
    const existing = await getInterestRegistrationByEmail(email);
    if (!existing) {
      throw new Error("Failed to retrieve existing registration after conflict");
    }

    return { isNew: false, registration: existing };
  } catch (error) {
    console.error("[Database] Error in createInterestRegistration:", error);
    throw error;
  }
}

export async function updateInterestEmailStatus(email: string, status: { confirmationSentAt?: Date; adminNotifiedAt?: Date; lastEmailError?: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(interestRegistrations).set(status).where(eq(interestRegistrations.email, email));
}
