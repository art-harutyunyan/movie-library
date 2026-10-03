import { Prisma } from "@prisma/client";
import type {
  MovieCreateInput,
  MovieDto,
  MovieListQuery,
  MoviePatchInput,
  MovieReplaceInput
} from "@/types/movie";
import { duplicateMovie, isUniqueConstraintError } from "../errors";
import { prisma } from "../prisma";
import type { Repository } from "./types";

type PrismaMovie = {
  id: string;
  title: string;
  director: string;
  year: number;
  genre: string;
  rating: Prisma.Decimal;
  watched: boolean;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function toMovieDto(movie: PrismaMovie): MovieDto {
  return {
    id: movie.id,
    title: movie.title,
    director: movie.director,
    year: movie.year,
    genre: movie.genre as MovieDto["genre"],
    rating: Number(movie.rating),
    watched: movie.watched,
    description: movie.description,
    createdAt: movie.createdAt.toISOString(),
    updatedAt: movie.updatedAt.toISOString()
  };
}

function movieData(input: MovieCreateInput | MovieReplaceInput) {
  return {
    title: input.title,
    director: input.director,
    year: input.year,
    genre: input.genre,
    rating: new Prisma.Decimal(input.rating),
    watched: input.watched ?? false,
    description: input.description ?? null
  };
}

export const prismaRepository: Repository = {
  async createWorkspace(input) {
    const workspace = await prisma.workspace.create({
      data: input
    });
    return {
      id: workspace.id,
      name: workspace.name,
      createdAt: workspace.createdAt.toISOString(),
      updatedAt: workspace.updatedAt.toISOString()
    };
  },

  async getWorkspace(id) {
    const workspace = await prisma.workspace.findUnique({ where: { id } });
    return workspace
      ? {
          id: workspace.id,
          name: workspace.name,
          createdAt: workspace.createdAt.toISOString(),
          updatedAt: workspace.updatedAt.toISOString()
        }
      : null;
  },

  async resetWorkspace(workspaceId, movies) {
    return prisma.$transaction(async (tx) => {
      await tx.movie.deleteMany({ where: { workspaceId } });
      const created = [];
      for (const movie of movies) {
        const record = await tx.movie.create({
          data: {
            ...movieData(movie),
            workspaceId
          }
        });
        created.push(toMovieDto(record));
      }
      return created;
    });
  },

  async listMovies(workspaceId, query: MovieListQuery) {
    const where: Prisma.MovieWhereInput = {
      workspaceId,
      ...(query.genre ? { genre: query.genre } : {}),
      ...(query.watched !== undefined ? { watched: query.watched } : {}),
      ...(query.search
        ? { title: { contains: query.search, mode: "insensitive" } }
        : {})
    };

    const orderBy: Prisma.MovieOrderByWithRelationInput = {
      [query.sortBy]: query.order
    };
    const [movies, total] = await prisma.$transaction([
      prisma.movie.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.limit,
        take: query.limit
      }),
      prisma.movie.count({ where })
    ]);

    return {
      data: movies.map(toMovieDto),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit)
      }
    };
  },

  async getMovie(workspaceId, movieId) {
    const movie = await prisma.movie.findFirst({
      where: { id: movieId, workspaceId }
    });
    return movie ? toMovieDto(movie) : null;
  },

  async createMovie(workspaceId, input) {
    try {
      const movie = await prisma.movie.create({
        data: {
          ...movieData(input),
          workspaceId
        }
      });
      return toMovieDto(movie);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw duplicateMovie();
      }
      throw error;
    }
  },

  async replaceMovie(workspaceId, movieId, input) {
    try {
      const result = await prisma.movie.updateManyAndReturn({
        where: { id: movieId, workspaceId },
        data: movieData(input)
      });
      return result[0] ? toMovieDto(result[0]) : null;
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw duplicateMovie();
      }
      throw error;
    }
  },

  async patchMovie(workspaceId, movieId, input: MoviePatchInput) {
    try {
      const data: Prisma.MovieUpdateManyMutationInput = {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.director !== undefined ? { director: input.director } : {}),
        ...(input.year !== undefined ? { year: input.year } : {}),
        ...(input.genre !== undefined ? { genre: input.genre } : {}),
        ...(input.rating !== undefined
          ? { rating: new Prisma.Decimal(input.rating) }
          : {}),
        ...(input.watched !== undefined ? { watched: input.watched } : {}),
        ...(Object.prototype.hasOwnProperty.call(input, "description")
          ? { description: input.description ?? null }
          : {})
      };
      const result = await prisma.movie.updateManyAndReturn({
        where: { id: movieId, workspaceId },
        data
      });
      return result[0] ? toMovieDto(result[0]) : null;
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw duplicateMovie();
      }
      throw error;
    }
  },

  async deleteMovie(workspaceId, movieId) {
    const result = await prisma.movie.deleteMany({
      where: { id: movieId, workspaceId }
    });
    return result.count > 0;
  },

  async consumeRateLimit(input) {
    const now = new Date();
    const resetAt = new Date(now.getTime() + input.windowSeconds * 1000);

    const existing = await prisma.rateLimitBucket.findUnique({
      where: { key: input.key }
    });

    if (!existing || existing.resetAt <= now) {
      await prisma.rateLimitBucket.upsert({
        where: { key: input.key },
        create: { key: input.key, count: 1, resetAt },
        update: { count: 1, resetAt }
      });
      return { allowed: true, resetAt };
    }

    const updated = await prisma.rateLimitBucket.update({
      where: { key: input.key },
      data: { count: { increment: 1 } }
    });

    return {
      allowed: updated.count <= input.maxRequests,
      resetAt: updated.resetAt
    };
  }
};
