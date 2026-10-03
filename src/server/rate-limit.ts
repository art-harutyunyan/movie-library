import { ApiError } from "./errors";
import { getRepository } from "./repositories";

const DEFAULT_WINDOW_SECONDS = 60;
const DEFAULT_MAX_REQUESTS = 30;

function readPositiveInt(value: string | undefined, fallback: number) {
  const parsed = value ? Number(value) : NaN;
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export async function enforceRateLimit(key: string) {
  const windowSeconds = readPositiveInt(
    process.env.RATE_LIMIT_WINDOW_SECONDS,
    DEFAULT_WINDOW_SECONDS
  );
  const maxRequests = readPositiveInt(
    process.env.RATE_LIMIT_MAX_REQUESTS,
    DEFAULT_MAX_REQUESTS
  );

  const result = await getRepository().consumeRateLimit({
    key,
    windowSeconds,
    maxRequests
  });

  if (!result.allowed) {
    throw new ApiError(
      429,
      "RATE_LIMIT_EXCEEDED",
      `Too many write requests. Try again after ${result.resetAt.toISOString()}`
    );
  }
}
