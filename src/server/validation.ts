import { z } from "zod";
import { GENRES } from "@/types/movie";
import type { MovieListQuery } from "@/types/movie";
import { validationError } from "./errors";

const currentYear = new Date().getUTCFullYear();

export const uuidSchema = z.string().uuid("Expected a valid UUID");

const stringField = (name: string) =>
  z
    .string({
      required_error: `${name} is required`,
      invalid_type_error: `${name} must be a string`
    })
    .trim()
    .min(2, `${name} must be at least 2 characters`)
    .max(100, `${name} must be at most 100 characters`);

const yearSchema = z
  .number({
    required_error: "year is required",
    invalid_type_error: "year must be a number"
  })
  .int("year must be an integer")
  .min(1888, "year must be 1888 or later")
  .max(currentYear, `year must be ${currentYear} or earlier`);

const ratingSchema = z
  .number({
    required_error: "rating is required",
    invalid_type_error: "rating must be a number"
  })
  .min(0, "rating must be between 0 and 10")
  .max(10, "rating must be between 0 and 10");

const descriptionSchema = z
  .string({ invalid_type_error: "description must be a string or null" })
  .max(1000, "description must be at most 1000 characters")
  .nullable();

const writableMovieFields = {
  title: stringField("title"),
  director: stringField("director"),
  year: yearSchema,
  genre: z.enum(GENRES, {
    required_error: "genre is required",
    invalid_type_error: "genre must be a supported value"
  }),
  rating: ratingSchema,
  watched: z
    .boolean({ invalid_type_error: "watched must be a boolean" })
    .optional(),
  description: descriptionSchema.optional()
};

export const createMovieSchema = z.object(writableMovieFields).strict();

export const replaceMovieSchema = z
  .object({
    ...writableMovieFields,
    watched: writableMovieFields.watched.default(false),
    description: descriptionSchema.optional().default(null)
  })
  .strict();

export const patchMovieSchema = z
  .object({
    title: writableMovieFields.title.optional(),
    director: writableMovieFields.director.optional(),
    year: yearSchema.optional(),
    genre: writableMovieFields.genre.optional(),
    rating: ratingSchema.optional(),
    watched: z
      .boolean({ invalid_type_error: "watched must be a boolean" })
      .optional(),
    description: descriptionSchema.optional()
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "PATCH body must include at least one writable field"
  });

export const workspaceCreateSchema = z
  .object({
    name: z
      .string({ invalid_type_error: "name must be a string" })
      .trim()
      .min(2, "name must be at least 2 characters")
      .max(100, "name must be at most 100 characters")
      .optional()
  })
  .strict()
  .optional();

export function parseUuid(id: string, field = "id") {
  const parsed = uuidSchema.safeParse(id);
  if (!parsed.success) {
    throw validationError("Invalid identifier", [
      { field, message: "Expected a valid UUID" }
    ]);
  }
  return parsed.data;
}

export function requireWorkspaceHeader(headers: Headers) {
  const workspaceId = headers.get("x-workspace-id");
  if (!workspaceId) {
    throw validationError("X-Workspace-ID header is required", [
      { field: "X-Workspace-ID", message: "Header is required" }
    ]);
  }
  return parseUuid(workspaceId, "X-Workspace-ID");
}

function getSingle(searchParams: URLSearchParams, key: string) {
  const values = searchParams.getAll(key);
  if (values.length > 1) {
    throw validationError("Invalid query parameters", [
      { field: key, message: "Parameter may only be provided once" }
    ]);
  }
  return values[0];
}

export function parseMovieListQuery(searchParams: URLSearchParams): MovieListQuery {
  const allowed = new Set([
    "genre",
    "watched",
    "search",
    "sortBy",
    "order",
    "page",
    "limit"
  ]);

  for (const key of searchParams.keys()) {
    if (!allowed.has(key)) {
      throw validationError("Invalid query parameters", [
        { field: key, message: "Unsupported query parameter" }
      ]);
    }
  }

  const genre = getSingle(searchParams, "genre");
  const watched = getSingle(searchParams, "watched");
  const search = getSingle(searchParams, "search");
  const sortBy = getSingle(searchParams, "sortBy") ?? "createdAt";
  const order = getSingle(searchParams, "order") ?? "desc";
  const page = getSingle(searchParams, "page") ?? "1";
  const limit = getSingle(searchParams, "limit") ?? "10";

  const schema = z.object({
    genre: z.enum(GENRES).optional(),
    watched: z
      .enum(["true", "false"])
      .transform((value) => value === "true")
      .optional(),
    search: z.string().trim().min(1).max(100).optional(),
    sortBy: z.enum(["title", "year", "rating", "createdAt"]),
    order: z.enum(["asc", "desc"]),
    page: z
      .string()
      .regex(/^\d+$/, "page must be a positive integer")
      .transform(Number)
      .pipe(z.number().int().min(1)),
    limit: z
      .string()
      .regex(/^\d+$/, "limit must be a positive integer")
      .transform(Number)
      .pipe(z.number().int().min(1).max(100))
  });

  return schema.parse({ genre, watched, search, sortBy, order, page, limit });
}
