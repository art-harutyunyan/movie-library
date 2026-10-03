import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

export type ErrorDetail = {
  field: string;
  message: string;
};

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: ErrorDetail[]
  ) {
    super(message);
  }
}

export function validationError(message: string, details: ErrorDetail[] = []) {
  return new ApiError(400, "VALIDATION_ERROR", message, details);
}

export function notFound(message = "Resource not found") {
  return new ApiError(404, "NOT_FOUND", message);
}

export function duplicateMovie() {
  return new ApiError(
    409,
    "DUPLICATE_MOVIE",
    "A movie with the same title and year already exists in this workspace"
  );
}

export function fromZodError(error: ZodError) {
  const details = error.issues.map((issue) => ({
    field: issue.path.length ? issue.path.join(".") : "body",
    message: issue.message
  }));
  return validationError("Request validation failed", details);
}

export function isUniqueConstraintError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}
