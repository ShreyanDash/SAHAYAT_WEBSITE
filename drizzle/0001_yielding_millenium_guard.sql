CREATE TABLE IF NOT EXISTS "interestRegistrations" (
  "id" integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "email" varchar(320) NOT NULL,
  "consentedAt" timestamp NOT NULL DEFAULT now(),
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "confirmationSentAt" timestamp,
  "adminNotifiedAt" timestamp,
  "lastEmailError" text,
  CONSTRAINT "interestRegistrations_email_unique" UNIQUE ("email")
);
