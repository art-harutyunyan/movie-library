import { afterEach, beforeEach } from "vitest";
import { prisma } from "@/server/prisma";

process.env.RATE_LIMIT_WINDOW_SECONDS = "60";
process.env.RATE_LIMIT_MAX_REQUESTS = "200";
delete process.env.USE_IN_MEMORY_REPOSITORY;

beforeEach(() => {
  process.env.RATE_LIMIT_MAX_REQUESTS = "200";
});

afterEach(async () => {
  await prisma.workspace.deleteMany({
    where: {
      name: {
        startsWith: "Vitest Workspace"
      }
    }
  });
  await prisma.rateLimitBucket.deleteMany({
    where: {
      key: {
        contains: "vitest"
      }
    }
  });
});
