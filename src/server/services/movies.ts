import type {
  MovieCreateInput,
  MovieListQuery,
  MoviePatchInput,
  MovieReplaceInput
} from "@/types/movie";
import { notFound } from "../errors";
import { getRepository } from "../repositories";
import { getWorkspace } from "./workspaces";

export async function listMovies(workspaceId: string, query: MovieListQuery) {
  await getWorkspace(workspaceId);
  return getRepository().listMovies(workspaceId, query);
}

export async function getMovie(workspaceId: string, movieId: string) {
  await getWorkspace(workspaceId);
  const movie = await getRepository().getMovie(workspaceId, movieId);
  if (!movie) {
    throw notFound("Movie not found in the selected workspace");
  }
  return movie;
}

export async function createMovie(
  workspaceId: string,
  input: MovieCreateInput
) {
  await getWorkspace(workspaceId);
  return getRepository().createMovie(workspaceId, input);
}

export async function replaceMovie(
  workspaceId: string,
  movieId: string,
  input: MovieReplaceInput
) {
  await getWorkspace(workspaceId);
  const movie = await getRepository().replaceMovie(workspaceId, movieId, input);
  if (!movie) {
    throw notFound("Movie not found in the selected workspace");
  }
  return movie;
}

export async function patchMovie(
  workspaceId: string,
  movieId: string,
  input: MoviePatchInput
) {
  await getWorkspace(workspaceId);
  const movie = await getRepository().patchMovie(workspaceId, movieId, input);
  if (!movie) {
    throw notFound("Movie not found in the selected workspace");
  }
  return movie;
}

export async function deleteMovie(workspaceId: string, movieId: string) {
  await getWorkspace(workspaceId);
  const deleted = await getRepository().deleteMovie(workspaceId, movieId);
  if (!deleted) {
    throw notFound("Movie not found in the selected workspace");
  }
}
