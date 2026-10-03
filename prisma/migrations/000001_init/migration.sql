CREATE TABLE "workspaces" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" VARCHAR(100) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "movies" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "title" VARCHAR(100) NOT NULL,
  "director" VARCHAR(100) NOT NULL,
  "year" INTEGER NOT NULL,
  "genre" VARCHAR(40) NOT NULL,
  "rating" DECIMAL(4,2) NOT NULL,
  "watched" BOOLEAN NOT NULL DEFAULT false,
  "description" VARCHAR(1000),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "workspace_id" UUID NOT NULL,
  CONSTRAINT "movies_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "movies_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "movies_year_check" CHECK ("year" BETWEEN 1888 AND 2100),
  CONSTRAINT "movies_rating_check" CHECK ("rating" >= 0 AND "rating" <= 10),
  CONSTRAINT "movies_genre_check" CHECK ("genre" IN (
    'Action',
    'Adventure',
    'Animation',
    'Comedy',
    'Crime',
    'Documentary',
    'Drama',
    'Fantasy',
    'Horror',
    'Mystery',
    'Romance',
    'Sci-Fi',
    'Thriller'
  ))
);

CREATE TABLE "rate_limit_buckets" (
  "key" VARCHAR(160) NOT NULL,
  "count" INTEGER NOT NULL,
  "reset_at" TIMESTAMP(3) NOT NULL,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "rate_limit_buckets_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "movies_workspace_id_idx" ON "movies"("workspace_id");
CREATE INDEX "movies_workspace_id_genre_idx" ON "movies"("workspace_id", "genre");
CREATE INDEX "movies_workspace_id_watched_idx" ON "movies"("workspace_id", "watched");
CREATE INDEX "movies_workspace_id_created_at_idx" ON "movies"("workspace_id", "created_at");
CREATE UNIQUE INDEX "movies_workspace_title_year_unique_idx" ON "movies"("workspace_id", lower("title"), "year");
