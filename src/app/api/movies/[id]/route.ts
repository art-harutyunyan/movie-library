import { NextRequest } from "next/server";
import {
  patchMovieSchema,
  parseUuid,
  replaceMovieSchema,
  requireWorkspaceHeader
} from "@/server/validation";
import {
  deleteMovie,
  getMovie,
  patchMovie,
  replaceMovie
} from "@/server/services/movies";
import {
  emptyResponse,
  getClientKey,
  jsonResponse,
  parseJsonBody,
  withApiErrorHandling
} from "@/server/http";
import { enforceRateLimit } from "@/server/rate-limit";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Params) {
  return withApiErrorHandling(async () => {
    const workspaceId = requireWorkspaceHeader(request.headers);
    const { id } = await context.params;
    const movie = await getMovie(workspaceId, parseUuid(id));
    return jsonResponse({ data: movie });
  }, { route: "GET /api/movies/{id}" });
}

export async function PUT(request: NextRequest, context: Params) {
  return withApiErrorHandling(async () => {
    const workspaceId = requireWorkspaceHeader(request.headers);
    const { id } = await context.params;
    const movieId = parseUuid(id);
    await enforceRateLimit(`movie:write:${workspaceId}:${getClientKey(request)}`);
    const body = await parseJsonBody(request);
    const input = replaceMovieSchema.parse(body);
    const movie = await replaceMovie(workspaceId, movieId, input);
    return jsonResponse({ data: movie });
  }, { route: "PUT /api/movies/{id}" });
}

export async function PATCH(request: NextRequest, context: Params) {
  return withApiErrorHandling(async () => {
    const workspaceId = requireWorkspaceHeader(request.headers);
    const { id } = await context.params;
    const movieId = parseUuid(id);
    await enforceRateLimit(`movie:write:${workspaceId}:${getClientKey(request)}`);
    const body = await parseJsonBody(request);
    const input = patchMovieSchema.parse(body);
    const movie = await patchMovie(workspaceId, movieId, input);
    return jsonResponse({ data: movie });
  }, { route: "PATCH /api/movies/{id}" });
}

export async function DELETE(request: NextRequest, context: Params) {
  return withApiErrorHandling(async () => {
    const workspaceId = requireWorkspaceHeader(request.headers);
    const { id } = await context.params;
    const movieId = parseUuid(id);
    await enforceRateLimit(`movie:write:${workspaceId}:${getClientKey(request)}`);
    await deleteMovie(workspaceId, movieId);
    return emptyResponse();
  }, { route: "DELETE /api/movies/{id}" });
}
