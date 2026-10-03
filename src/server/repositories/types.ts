import type {
  MovieCreateInput,
  MovieDto,
  MovieListQuery,
  MoviePatchInput,
  MovieReplaceInput,
  PaginatedMovies,
  WorkspaceDto
} from "@/types/movie";

export type Repository = {
  createWorkspace(input: { name: string }): Promise<WorkspaceDto>;
  getWorkspace(id: string): Promise<WorkspaceDto | null>;
  resetWorkspace(workspaceId: string, movies: MovieCreateInput[]): Promise<MovieDto[]>;
  listMovies(workspaceId: string, query: MovieListQuery): Promise<PaginatedMovies>;
  getMovie(workspaceId: string, movieId: string): Promise<MovieDto | null>;
  createMovie(workspaceId: string, input: MovieCreateInput): Promise<MovieDto>;
  replaceMovie(
    workspaceId: string,
    movieId: string,
    input: MovieReplaceInput
  ): Promise<MovieDto | null>;
  patchMovie(
    workspaceId: string,
    movieId: string,
    input: MoviePatchInput
  ): Promise<MovieDto | null>;
  deleteMovie(workspaceId: string, movieId: string): Promise<boolean>;
  consumeRateLimit(input: {
    key: string;
    windowSeconds: number;
    maxRequests: number;
  }): Promise<{ allowed: boolean; resetAt: Date }>;
};
