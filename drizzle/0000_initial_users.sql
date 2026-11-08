DO $$ BEGIN
  CREATE TYPE "user_role" AS ENUM ('user', 'admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "users" (
  "id" integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "openId" varchar(64) NOT NULL,
  "name" text,
  "email" varchar(320),
  "loginMethod" varchar(64),
  "role" "user_role" NOT NULL DEFAULT 'user',
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now(),
  "lastSignedIn" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "users_openId_unique" UNIQUE ("openId")
);
