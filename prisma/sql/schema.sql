-- ============================================================================
-- Goal Quest — complete database schema (PostgreSQL / Neon)
--
-- Generated from prisma/schema.prisma with:
--   npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script
--
-- The whole application is one table. Milestones, recurring tasks, stages,
-- completions and check-ins all live in JSONB columns on the goal, which is
-- why feature work rarely needs a migration.
--
-- Safe to run against an existing database: every statement is idempotent, so
-- this both creates the schema from scratch and brings an older database up to
-- date without touching existing rows.
-- ============================================================================

CREATE TABLE IF NOT EXISTS "goals" (
    "id"              TEXT             NOT NULL,
    "userId"          TEXT             NOT NULL,
    "title"           TEXT             NOT NULL,
    "description"     TEXT             NOT NULL DEFAULT '',
    "category"        TEXT             NOT NULL DEFAULT 'personal',
    "targetValue"     DOUBLE PRECISION NOT NULL,
    "currentValue"    DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unit"            TEXT             NOT NULL DEFAULT '',
    "startDate"       TEXT,
    "endDate"         TEXT,
    "color"           TEXT             NOT NULL DEFAULT '#58CC02',
    "createdAt"       TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3)     NOT NULL,

    -- Plan structure
    "stages"          JSONB            NOT NULL DEFAULT '[]',  -- ordered phases of the journey
    "subtasks"        JSONB            NOT NULL DEFAULT '[]',  -- milestones (each may carry a stageId)
    "dailyTasks"      JSONB            NOT NULL DEFAULT '[]',  -- recurring tasks + protocol + fallback

    -- Execution history
    "taskCompletions" JSONB            NOT NULL DEFAULT '{}',  -- { "YYYY-MM-DD": { taskId: true | 'fallback' } }
    "checkIns"        JSONB            NOT NULL DEFAULT '[]',  -- ["YYYY-MM-DD", ...]
    "progressHistory" JSONB            NOT NULL DEFAULT '[]',

    -- Unused by the application; retained so db push does not drop it.
    "milestones"      JSONB            NOT NULL DEFAULT '[]',

    "sharedWith"      JSONB            NOT NULL DEFAULT '[]',  -- accountability partner emails

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "goals_userId_idx" ON "goals"("userId");

-- ---------------------------------------------------------------------------
-- Bring an older database up to date.
--
-- Adding a NOT NULL column with a constant default is metadata-only on
-- PostgreSQL 11+, so these are instant regardless of table size and leave
-- existing rows untouched.
-- ---------------------------------------------------------------------------
ALTER TABLE "goals" ADD COLUMN IF NOT EXISTS "stages"          JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "goals" ADD COLUMN IF NOT EXISTS "subtasks"        JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "goals" ADD COLUMN IF NOT EXISTS "dailyTasks"      JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "goals" ADD COLUMN IF NOT EXISTS "taskCompletions" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "goals" ADD COLUMN IF NOT EXISTS "checkIns"        JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "goals" ADD COLUMN IF NOT EXISTS "progressHistory" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "goals" ADD COLUMN IF NOT EXISTS "milestones"      JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "goals" ADD COLUMN IF NOT EXISTS "sharedWith"      JSONB NOT NULL DEFAULT '[]';
