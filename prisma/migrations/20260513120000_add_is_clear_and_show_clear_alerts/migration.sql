ALTER TABLE "Message" ADD COLUMN "isClear" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Notification" ADD COLUMN "isClear" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "showClearAlerts" BOOLEAN NOT NULL DEFAULT true;
CREATE INDEX "Notification_isClear_idx" ON "Notification"("isClear");
