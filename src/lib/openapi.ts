import { GENRES } from "@/types/movie";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";

export const openApiSpec = {
  openapi: "3.1.0",
  info: {
    title: "Movie Library API",
    version: "1.0.0",
    description:
      "A public REST API training surface for QA engineers. Anonymous workspace identifiers separate data for training convenience; they are not authentication secrets."
  },
  servers: [
    {
      url: appUrl || "/",
      description: appUrl ? "Configured deployment" : "Current origin"
    }
  ],
  tags: [
    { name: "Workspaces", description: "Anonymous training workspace management" },
    { name: "Movies", description: "Workspace-scoped movie CRUD operations" }
  ],
  components: {
    securitySchemes: {
      WorkspaceHeader: {
        type: "apiKey",
        in: "header",
        name: "X-Workspace-ID",
        description:
          "Anonymous workspace UUID. This separates training data but does not provide secure authorization."
      }
    },
    schemas: {
      ErrorResponse: {
        type: "object",
        required: ["error"],
        properties: {
          error: {
            type: "object",
            required: ["code", "message"],
            properties: {
              code: { type: "string", example: "VALIDATION_ERROR" },
              message: { type: "string", example: "Request validation failed" },
              details: {
                type: "array",
                items: {
                  type: "object",
                  required: ["field", "message"],
                  properties: {
                    field: { type: "string", example: "rating" },
                    message: {
                      type: "string",
                      example: "rating must be between 0 and 10"
                    }
                  }
                }
              }
            }
          }
        }
      },
      Workspace: {
        type: "object",
        required: ["id", "name", "createdAt", "updatedAt"],
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" }
        }
      },
      Movie: {
        type: "object",
        required: [
          "id",
          "title",
          "director",
          "year",
          "genre",
          "rating",
          "watched",
          "description",
          "createdAt",
          "updatedAt"
        ],
        properties: {
          id: { type: "string", format: "uuid" },
          title: { type: "string", minLength: 2, maxLength: 100 },
          director: { type: "string", minLength: 2, maxLength: 100 },
          year: { type: "integer", minimum: 1888, maximum: new Date().getUTCFullYear() },
          genre: { type: "string", enum: GENRES },
          rating: { type: "number", minimum: 0, maximum: 10 },
          watched: { type: "boolean", default: false },
          description: {
            anyOf: [{ type: "string", maxLength: 1000 }, { type: "null" }]
          },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" }
        }
      },
      MovieCreate: {
        type: "object",
        additionalProperties: false,
        required: ["title", "director", "year", "genre", "rating"],
        properties: {
          title: { type: "string", minLength: 2, maxLength: 100, example: "Inception" },
          director: {
            type: "string",
            minLength: 2,
            maxLength: 100,
            example: "Christopher Nolan"
          },
          year: { type: "integer", minimum: 1888, example: 2010 },
          genre: { type: "string", enum: GENRES, example: "Sci-Fi" },
          rating: { type: "number", minimum: 0, maximum: 10, example: 8.8 },
          watched: { type: "boolean", default: false },
          description: {
            anyOf: [{ type: "string", maxLength: 1000 }, { type: "null" }],
            example: "A science fiction thriller."
          }
        }
      },
      MoviePatch: {
        allOf: [{ $ref: "#/components/schemas/MovieCreate" }],
        description:
          "Partial update body. At least one writable property must be supplied."
      },
      PaginatedMovies: {
        type: "object",
        required: ["data", "pagination"],
        properties: {
          data: { type: "array", items: { $ref: "#/components/schemas/Movie" } },
          pagination: {
            type: "object",
            required: ["page", "limit", "total", "totalPages"],
            properties: {
              page: { type: "integer", example: 1 },
              limit: { type: "integer", example: 10 },
              total: { type: "integer", example: 1 },
              totalPages: { type: "integer", example: 1 }
            }
          }
        }
      }
    },
    responses: {
      BadRequest: {
        description: "Invalid request",
        content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
      },
      NotFound: {
        description: "Resource not found",
        content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
      },
      Conflict: {
        description: "Duplicate movie",
        content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
      },
      UnsupportedMedia: {
        description: "Unsupported request content type",
        content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
      },
      RateLimited: {
        description: "Rate limit exceeded",
        content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
      },
      ServerError: {
        description: "Unexpected server error",
        content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
      }
    }
  },
  paths: {
    "/api/workspaces": {
      post: {
        tags: ["Workspaces"],
        summary: "Create an anonymous workspace",
        description:
          "Creates a workspace and seeds it with deterministic sample movies. The returned UUID must be sent as X-Workspace-ID for movie operations.",
        requestBody: {
          required: false,
          content: {
            "application/json": {
              schema: {
                type: "object",
                additionalProperties: false,
                properties: {
                  name: { type: "string", minLength: 2, maxLength: 100 }
                }
              },
              examples: {
                default: { value: { name: "QA Training Workspace" } }
              }
            }
          }
        },
        responses: {
          "201": {
            description: "Workspace created",
            headers: {
              Location: { schema: { type: "string" }, description: "New workspace URL" }
            },
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    workspace: { $ref: "#/components/schemas/Workspace" },
                    moviesSeeded: { type: "integer", example: 10 }
                  }
                }
              }
            }
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "415": { $ref: "#/components/responses/UnsupportedMedia" },
          "429": { $ref: "#/components/responses/RateLimited" },
          "500": { $ref: "#/components/responses/ServerError" }
        }
      }
    },
    "/api/workspaces/{id}": {
      get: {
        tags: ["Workspaces"],
        summary: "Get workspace metadata",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }
        ],
        responses: {
          "200": {
            description: "Workspace found",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { data: { $ref: "#/components/schemas/Workspace" } }
                }
              }
            }
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "404": { $ref: "#/components/responses/NotFound" },
          "500": { $ref: "#/components/responses/ServerError" }
        }
      }
    },
    "/api/workspaces/{id}/reset": {
      post: {
        tags: ["Workspaces"],
        summary: "Reset workspace movies",
        description:
          "Deletes existing movies in the workspace and restores the deterministic seed dataset. Anyone with the anonymous workspace ID can perform this training action.",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }
        ],
        responses: {
          "200": {
            description: "Workspace reset",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: { type: "array", items: { $ref: "#/components/schemas/Movie" } },
                    seeded: { type: "integer", example: 10 }
                  }
                }
              }
            }
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "404": { $ref: "#/components/responses/NotFound" },
          "429": { $ref: "#/components/responses/RateLimited" },
          "500": { $ref: "#/components/responses/ServerError" }
        }
      }
    },
    "/api/movies": {
      get: {
        tags: ["Movies"],
        summary: "List workspace movies",
        security: [{ WorkspaceHeader: [] }],
        parameters: [
          { name: "X-Workspace-ID", in: "header", required: true, schema: { type: "string", format: "uuid" } },
          { name: "genre", in: "query", schema: { type: "string", enum: GENRES } },
          { name: "watched", in: "query", schema: { type: "boolean" } },
          { name: "search", in: "query", schema: { type: "string" }, description: "Case-insensitive title search" },
          { name: "sortBy", in: "query", schema: { type: "string", enum: ["title", "year", "rating", "createdAt"], default: "createdAt" } },
          { name: "order", in: "query", schema: { type: "string", enum: ["asc", "desc"], default: "desc" } },
          { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 10 } }
        ],
        responses: {
          "200": {
            description: "Movies returned",
            content: { "application/json": { schema: { $ref: "#/components/schemas/PaginatedMovies" } } }
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "404": { $ref: "#/components/responses/NotFound" },
          "500": { $ref: "#/components/responses/ServerError" }
        }
      },
      post: {
        tags: ["Movies"],
        summary: "Create a movie",
        security: [{ WorkspaceHeader: [] }],
        parameters: [
          { name: "X-Workspace-ID", in: "header", required: true, schema: { type: "string", format: "uuid" } }
        ],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/MovieCreate" } } }
        },
        responses: {
          "201": {
            description: "Movie created",
            headers: { Location: { schema: { type: "string" } } },
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { data: { $ref: "#/components/schemas/Movie" } }
                }
              }
            }
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "404": { $ref: "#/components/responses/NotFound" },
          "409": { $ref: "#/components/responses/Conflict" },
          "415": { $ref: "#/components/responses/UnsupportedMedia" },
          "429": { $ref: "#/components/responses/RateLimited" },
          "500": { $ref: "#/components/responses/ServerError" }
        }
      }
    },
    "/api/movies/{id}": {
      get: {
        tags: ["Movies"],
        summary: "Get a movie",
        security: [{ WorkspaceHeader: [] }],
        parameters: [
          { name: "X-Workspace-ID", in: "header", required: true, schema: { type: "string", format: "uuid" } },
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }
        ],
        responses: {
          "200": {
            description: "Movie found",
            content: { "application/json": { schema: { type: "object", properties: { data: { $ref: "#/components/schemas/Movie" } } } } }
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "404": { $ref: "#/components/responses/NotFound" },
          "500": { $ref: "#/components/responses/ServerError" }
        }
      },
      put: {
        tags: ["Movies"],
        summary: "Replace a movie",
        description:
          "Full replacement. Mandatory writable fields are required. Omitted optional fields receive documented defaults. Server-managed fields are rejected.",
        security: [{ WorkspaceHeader: [] }],
        parameters: [
          { name: "X-Workspace-ID", in: "header", required: true, schema: { type: "string", format: "uuid" } },
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }
        ],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/MovieCreate" } } }
        },
        responses: {
          "200": { description: "Movie replaced", content: { "application/json": { schema: { type: "object", properties: { data: { $ref: "#/components/schemas/Movie" } } } } } },
          "400": { $ref: "#/components/responses/BadRequest" },
          "404": { $ref: "#/components/responses/NotFound" },
          "409": { $ref: "#/components/responses/Conflict" },
          "415": { $ref: "#/components/responses/UnsupportedMedia" },
          "429": { $ref: "#/components/responses/RateLimited" },
          "500": { $ref: "#/components/responses/ServerError" }
        }
      },
      patch: {
        tags: ["Movies"],
        summary: "Partially update a movie",
        security: [{ WorkspaceHeader: [] }],
        parameters: [
          { name: "X-Workspace-ID", in: "header", required: true, schema: { type: "string", format: "uuid" } },
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }
        ],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/MoviePatch" } } }
        },
        responses: {
          "200": { description: "Movie updated", content: { "application/json": { schema: { type: "object", properties: { data: { $ref: "#/components/schemas/Movie" } } } } } },
          "400": { $ref: "#/components/responses/BadRequest" },
          "404": { $ref: "#/components/responses/NotFound" },
          "409": { $ref: "#/components/responses/Conflict" },
          "415": { $ref: "#/components/responses/UnsupportedMedia" },
          "429": { $ref: "#/components/responses/RateLimited" },
          "500": { $ref: "#/components/responses/ServerError" }
        }
      },
      delete: {
        tags: ["Movies"],
        summary: "Delete a movie",
        security: [{ WorkspaceHeader: [] }],
        parameters: [
          { name: "X-Workspace-ID", in: "header", required: true, schema: { type: "string", format: "uuid" } },
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }
        ],
        responses: {
          "204": { description: "Movie deleted" },
          "400": { $ref: "#/components/responses/BadRequest" },
          "404": { $ref: "#/components/responses/NotFound" },
          "429": { $ref: "#/components/responses/RateLimited" },
          "500": { $ref: "#/components/responses/ServerError" }
        }
      }
    }
  }
} as const;
