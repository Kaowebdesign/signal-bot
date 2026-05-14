-- Add trackStats column to Route
ALTER TABLE "Route" ADD COLUMN "trackStats" BOOLEAN NOT NULL DEFAULT true;

-- Create DailyStat table
CREATE TABLE "DailyStat" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "totalCount" INTEGER NOT NULL DEFAULT 0,
    "topRouteName" TEXT,
    "topLocation" TEXT,
    CONSTRAINT "DailyStat_pkey" PRIMARY KEY ("id")
);

-- Unique constraint (userId + date)
CREATE UNIQUE INDEX "DailyStat_userId_date_key" ON "DailyStat"("userId", "date");

-- Index for lookups by user
CREATE INDEX "DailyStat_userId_idx" ON "DailyStat"("userId");

-- Foreign key to User
ALTER TABLE "DailyStat" ADD CONSTRAINT "DailyStat_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
