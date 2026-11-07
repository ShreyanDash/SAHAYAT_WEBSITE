import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertInterestRegistration, InsertUser, interestRegistrations, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    throw new Error("Database is not available");
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getInterestRegistrationByEmail(email: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");

  const result = await db.select().from(interestRegistrations).where(eq(interestRegistrations.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createInterestRegistration(email: string): Promise<{ isNew: boolean; registration: Awaited<ReturnType<typeof getInterestRegistrationByEmail>> }> {
  const existing = await getInterestRegistrationByEmail(email);
  if (existing) return { isNew: false, registration: existing };

  const db = await getDb();
  if (!db) throw new Error("Database is not available");

  try {
    const values: InsertInterestRegistration = { email, consentedAt: new Date() };
    await db.insert(interestRegistrations).values(values);
    return { isNew: true, registration: await getInterestRegistrationByEmail(email) };
  } catch (error) {
    // A concurrent duplicate submission can win the unique-email race.
    const concurrent = await getInterestRegistrationByEmail(email);
    if (concurrent) return { isNew: false, registration: concurrent };
    throw error;
  }
}

export async function updateInterestEmailStatus(email: string, status: { confirmationSentAt?: Date; adminNotifiedAt?: Date; lastEmailError?: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(interestRegistrations).set(status).where(eq(interestRegistrations.email, email));
}
