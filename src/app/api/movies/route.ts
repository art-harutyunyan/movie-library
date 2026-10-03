import { NextRequest } from "next/server";
import {
  createMovieSchema,
  parseMovieListQuery,
  requireWorkspaceHeader
} from "@/server/validation";
import { createMovie, listMovies } from "@/server/services/movies";
import {
  getClientKey,
  jsonResponse,
  parseJsonBody,
  withApiErrorHandling
} from "@/server/http";
import { enforceRateLimit } from "@/server/rate-limit";

export async function GET(request: NextRequest) {
  return withApiErrorHandling(async () => {
    const workspaceId = requireWorkspaceHeader(request.headers);
    const query = parseMovieListQuery(request.nextUrl.searchParams);
    const movies = await listMovies(workspaceId, query);
    return jsonResponse(movies);
  }, { route: "GET /api/movies" });
}

export async function POST(request: NextRequest) {
  return withApiErrorHandling(async () => {
    const workspaceId = requireWorkspaceHeader(request.headers);
    await enforceRateLimit(`movie:write:${workspaceId}:${getClientKey(request)}`);
    const body = await parseJsonBody(request);
    const input = createMovieSchema.parse(body);
    const movie = await createMovie(workspaceId, input);
    return jsonResponse({ data: movie }, 201, {
      Location: `/api/movies/${movie.id}`
    });
  }, { route: "POST /api/movies" });
}
