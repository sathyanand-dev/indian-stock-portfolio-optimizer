-- CreateTable
CREATE TABLE "user_preferences" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "theme" TEXT NOT NULL DEFAULT 'light',
    "language" TEXT NOT NULL DEFAULT 'en',
    "date_format" TEXT NOT NULL DEFAULT 'dd/MM/yyyy',
    "number_format" TEXT NOT NULL DEFAULT 'indian',
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "density" TEXT NOT NULL DEFAULT 'comfortable',
    "email_notifications" BOOLEAN NOT NULL DEFAULT true,
    "portfolio_alerts" BOOLEAN NOT NULL DEFAULT true,
    "market_news_alerts" BOOLEAN NOT NULL DEFAULT false,
    "performance_reports" BOOLEAN NOT NULL DEFAULT true,
    "ipo_alerts" BOOLEAN NOT NULL DEFAULT true,
    "digest_frequency" TEXT NOT NULL DEFAULT 'weekly',
    "data_retention" TEXT NOT NULL DEFAULT '2y',
    "analytics_opt_in" BOOLEAN NOT NULL DEFAULT false,
    "beta_features" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME,
    CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'system',
    "title" TEXT NOT NULL,
    "body" TEXT,
    "link" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'info',
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "email_sent" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "read_at" DATETIME,
    CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_users" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "hashed_password" TEXT,
    "full_name" TEXT,
    "phone" TEXT,
    "avatar_url" TEXT,
    "auth_provider" TEXT NOT NULL DEFAULT 'local',
    "google_id" TEXT,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "risk_tolerance" TEXT NOT NULL DEFAULT 'moderate',
    "investment_horizon" INTEGER NOT NULL DEFAULT 60,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME
);
INSERT INTO "new_users" ("created_at", "email", "full_name", "hashed_password", "id", "investment_horizon", "is_active", "risk_tolerance", "updated_at", "username") SELECT "created_at", "email", "full_name", "hashed_password", "id", "investment_horizon", "is_active", "risk_tolerance", "updated_at", "username" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
CREATE UNIQUE INDEX "users_google_id_key" ON "users"("google_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "user_preferences_user_id_key" ON "user_preferences"("user_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_idx" ON "notifications"("user_id", "is_read");

-- CreateIndex
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at");
