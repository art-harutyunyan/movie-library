import { memoryRepository } from "./memory";
import { prismaRepository } from "./prisma";
import type { Repository } from "./types";

export function getRepository(): Repository {
  if (process.env.USE_IN_MEMORY_REPOSITORY === "true") {
    return memoryRepository;
  }
  return prismaRepository;
}

export { memoryRepository };
