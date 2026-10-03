export const GENRES = [
  "Action",
  "Adventure",
  "Animation",
  "Comedy",
  "Crime",
  "Documentary",
  "Drama",
  "Fantasy",
  "Horror",
  "Mystery",
  "Romance",
  "Sci-Fi",
  "Thriller"
] as const;

export type Genre = (typeof GENRES)[number];

export type MovieDto = {
  id: string;
  title: string;
  director: string;
  year: number;
  genre: Genre;
  rating: number;
  watched: boolean;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

export type WorkspaceDto = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type MovieCreateInput = {
  title: string;
  director: string;
  year: number;
  genre: Genre;
  rating: number;
  watched?: boolean;
  description?: string | null;
};

export type MovieReplaceInput = {
  title: string;
  director: string;
  year: number;
  genre: Genre;
  rating: number;
  watched?: boolean;
  description?: string | null;
};

export type MoviePatchInput = Partial<MovieReplaceInput>;

export type MovieListQuery = {
  genre?: Genre;
  watched?: boolean;
  search?: string;
  sortBy: "title" | "year" | "rating" | "createdAt";
  order: "asc" | "desc";
  page: number;
  limit: number;
};

export type PaginatedMovies = {
  data: MovieDto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};
