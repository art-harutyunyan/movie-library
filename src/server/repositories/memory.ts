import type {
  MovieCreateInput,
  MovieDto,
  MovieListQuery,
  MoviePatchInput,
  MovieReplaceInput,
  PaginatedMovies,
  WorkspaceDto
} from "@/types/movie";
import { duplicateMovie } from "../errors";
import type { Repository } from "./types";

type MovieRecord = Omit<MovieDto, "createdAt" | "updatedAt"> & {
  createdAt: Date;
  updatedAt: Date;
  workspaceId: string;
};

type WorkspaceRecord = Omit<WorkspaceDto, "createdAt" | "updatedAt"> & {
  createdAt: Date;
  updatedAt: Date;
};

type BucketRecord = {
  count: number;
  resetAt: Date;
};

const uuid = () => crypto.randomUUID();

function iso(date: Date) {
  return date.toISOString();
}

function toMovieDto(movie: MovieRecord): MovieDto {
  return {
    id: movie.id,
    title: movie.title,
    director: movie.director,
    year: movie.year,
    genre: movie.genre,
    rating: movie.rating,
    watched: movie.watched,
    description: movie.description,
    createdAt: iso(movie.createdAt),
    updatedAt: iso(movie.updatedAt)
  };
}

function toWorkspaceDto(workspace: WorkspaceRecord): WorkspaceDto {
  return {
    ...workspace,
    createdAt: iso(workspace.createdAt),
    updatedAt: iso(workspace.updatedAt)
  };
}

function normalizeTitle(title: string) {
  return title.trim().toLocaleLowerCase();
}

export class MemoryRepository implements Repository {
  private workspaces = new Map<string, WorkspaceRecord>();
  private movies = new Map<string, MovieRecord>();
  private buckets = new Map<string, BucketRecord>();

  reset() {
    this.workspaces.clear();
    this.movies.clear();
    this.buckets.clear();
  }

  async createWorkspace(input: { name: string }) {
    const now = new Date();
    const workspace: WorkspaceRecord = {
      id: uuid(),
      name: input.name,
      createdAt: now,
      updatedAt: now
    };
    this.workspaces.set(workspace.id, workspace);
    return toWorkspaceDto(workspace);
  }

  async getWorkspace(id: string) {
    const workspace = this.workspaces.get(id);
    return workspace ? toWorkspaceDto(workspace) : null;
  }

  async resetWorkspace(workspaceId: string, movies: MovieCreateInput[]) {
    for (const [id, movie] of this.movies) {
      if (movie.workspaceId === workspaceId) {
        this.movies.delete(id);
      }
    }

    const created: MovieDto[] = [];
    for (const movie of movies) {
      created.push(await this.createMovie(workspaceId, movie));
    }
    return created;
  }

  async listMovies(workspaceId: string, query: MovieListQuery): Promise<PaginatedMovies> {
    let movies = [...this.movies.values()].filter(
      (movie) => movie.workspaceId === workspaceId
    );

    if (query.genre) {
      movies = movies.filter((movie) => movie.genre === query.genre);
    }

    if (query.watched !== undefined) {
      movies = movies.filter((movie) => movie.watched === query.watched);
    }

    if (query.search) {
      const needle = query.search.toLocaleLowerCase();
      movies = movies.filter((movie) =>
        movie.title.toLocaleLowerCase().includes(needle)
      );
    }

    movies.sort((left, right) => {
      const leftValue = left[query.sortBy];
      const rightValue = right[query.sortBy];
      const comparison =
        leftValue instanceof Date && rightValue instanceof Date
          ? leftValue.getTime() - rightValue.getTime()
          : typeof leftValue === "string" && typeof rightValue === "string"
            ? leftValue.localeCompare(rightValue)
            : Number(leftValue) - Number(rightValue);
      return query.order === "asc" ? comparison : -comparison;
    });

    const total = movies.length;
    const start = (query.page - 1) * query.limit;
    const data = movies.slice(start, start + query.limit).map(toMovieDto);

    return {
      data,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit)
      }
    };
  }

  async getMovie(workspaceId: string, movieId: string) {
    const movie = this.movies.get(movieId);
    return movie && movie.workspaceId === workspaceId ? toMovieDto(movie) : null;
  }

  async createMovie(workspaceId: string, input: MovieCreateInput) {
    this.ensureNoDuplicate(workspaceId, input.title, input.year);
    const now = new Date();
    const movie: MovieRecord = {
      id: uuid(),
      title: input.title,
      director: input.director,
      year: input.year,
      genre: input.genre,
      rating: input.rating,
      watched: input.watched ?? false,
      description: input.description ?? null,
      workspaceId,
      createdAt: now,
      updatedAt: now
    };
    this.movies.set(movie.id, movie);
    return toMovieDto(movie);
  }

  async replaceMovie(workspaceId: string, movieId: string, input: MovieReplaceInput) {
    const existing = this.movies.get(movieId);
    if (!existing || existing.workspaceId !== workspaceId) {
      return null;
    }

    this.ensureNoDuplicate(workspaceId, input.title, input.year, movieId);
    const updated: MovieRecord = {
      ...existing,
      title: input.title,
      director: input.director,
      year: input.year,
      genre: input.genre,
      rating: input.rating,
      watched: input.watched ?? false,
      description: input.description ?? null,
      updatedAt: new Date()
    };
    this.movies.set(movieId, updated);
    return toMovieDto(updated);
  }

  async patchMovie(workspaceId: string, movieId: string, input: MoviePatchInput) {
    const existing = this.movies.get(movieId);
    if (!existing || existing.workspaceId !== workspaceId) {
      return null;
    }

    const nextTitle = input.title ?? existing.title;
    const nextYear = input.year ?? existing.year;
    this.ensureNoDuplicate(workspaceId, nextTitle, nextYear, movieId);

    const updated: MovieRecord = {
      ...existing,
      ...input,
      title: nextTitle,
      year: nextYear,
      description:
        Object.prototype.hasOwnProperty.call(input, "description")
          ? (input.description ?? null)
          : existing.description,
      updatedAt: new Date()
    };
    this.movies.set(movieId, updated);
    return toMovieDto(updated);
  }

  async deleteMovie(workspaceId: string, movieId: string) {
    const existing = this.movies.get(movieId);
    if (!existing || existing.workspaceId !== workspaceId) {
      return false;
    }
    return this.movies.delete(movieId);
  }

  async consumeRateLimit(input: {
    key: string;
    windowSeconds: number;
    maxRequests: number;
  }) {
    const now = new Date();
    const existing = this.buckets.get(input.key);
    if (!existing || existing.resetAt <= now) {
      const resetAt = new Date(now.getTime() + input.windowSeconds * 1000);
      this.buckets.set(input.key, { count: 1, resetAt });
      return { allowed: true, resetAt };
    }

    existing.count += 1;
    return {
      allowed: existing.count <= input.maxRequests,
      resetAt: existing.resetAt
    };
  }

  private ensureNoDuplicate(
    workspaceId: string,
    title: string,
    year: number,
    exceptMovieId?: string
  ) {
    const normalized = normalizeTitle(title);
    const duplicate = [...this.movies.values()].find(
      (movie) =>
        movie.workspaceId === workspaceId &&
        movie.id !== exceptMovieId &&
        movie.year === year &&
        normalizeTitle(movie.title) === normalized
    );

    if (duplicate) {
      throw duplicateMovie();
    }
  }
}

export const memoryRepository = new MemoryRepository();
