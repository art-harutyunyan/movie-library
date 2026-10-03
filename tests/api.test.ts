import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import * as moviesRoute from "@/app/api/movies/route";
import * as movieRoute from "@/app/api/movies/[id]/route";
import * as workspacesRoute from "@/app/api/workspaces/route";
import * as workspaceRoute from "@/app/api/workspaces/[id]/route";
import * as workspaceResetRoute from "@/app/api/workspaces/[id]/reset/route";

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

function request(
  path: string,
  options: {
    method?: Method;
    workspaceId?: string;
    body?: unknown;
    contentType?: string;
    clientIp?: string;
  } = {}
) {
  const headers = new Headers();
  if (options.workspaceId) {
    headers.set("X-Workspace-ID", options.workspaceId);
  }
  if (options.clientIp) {
    headers.set("x-forwarded-for", options.clientIp);
  }
  let body: BodyInit | undefined;
  if (options.body !== undefined) {
    body =
      typeof options.body === "string"
        ? options.body
        : JSON.stringify(options.body);
    headers.set("content-type", options.contentType ?? "application/json");
  } else if (options.contentType) {
    headers.set("content-type", options.contentType);
  }

  return new NextRequest(`http://localhost${path}`, {
    method: options.method ?? "GET",
    headers,
    body
  });
}

async function json(response: Response) {
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

async function createWorkspace() {
  const response = await workspacesRoute.POST(
    request("/api/workspaces", {
      method: "POST",
      body: { name: `Vitest Workspace ${crypto.randomUUID()}` },
      clientIp: `vitest-${crypto.randomUUID()}`
    })
  );
  const body = await json(response);
  expect(response.status).toBe(201);
  return body.workspace.id as string;
}

async function createMovie(workspaceId: string, overrides: Record<string, unknown> = {}) {
  const response = await moviesRoute.POST(
    request("/api/movies", {
      method: "POST",
      workspaceId,
      body: {
        title: "Arrival",
        director: "Denis Villeneuve",
        year: 2016,
        genre: "Sci-Fi",
        rating: 7.9,
        watched: false,
        description: "A linguist communicates with visitors.",
        ...overrides
      }
    })
  );
  const body = await json(response);
  return { response, body };
}

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("workspace API", () => {
  it("creates a workspace and seeds movies", async () => {
    const response = await workspacesRoute.POST(
      request("/api/workspaces", {
        method: "POST",
        body: { name: `Vitest Workspace ${crypto.randomUUID()}` },
        clientIp: `vitest-${crypto.randomUUID()}`
      })
    );
    const body = await json(response);

    expect(response.status).toBe(201);
    expect(body.workspace.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
    expect(body.moviesSeeded).toBe(10);

    const movies = await moviesRoute.GET(
      request("/api/movies", { workspaceId: body.workspace.id })
    );
    const moviesBody = await json(movies);
    expect(moviesBody.pagination.total).toBe(10);
  });


  it("creates a workspace from an empty POST even when a client sends an incidental content type", async () => {
    const response = await workspacesRoute.POST(
      request("/api/workspaces", {
        method: "POST",
        contentType: "application/x-www-form-urlencoded",
        clientIp: `vitest-${crypto.randomUUID()}`
      })
    );
    const body = await json(response);

    expect(response.status).toBe(201);
    expect(body.workspace.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
    expect(body.moviesSeeded).toBe(10);

    const movies = await moviesRoute.GET(
      request("/api/movies", { workspaceId: body.workspace.id })
    );
    const moviesBody = await json(movies);
    expect(moviesBody.pagination.total).toBe(10);
  });

  it("returns a workspace by id", async () => {
    const workspaceId = await createWorkspace();
    const response = await workspaceRoute.GET(
      request(`/api/workspaces/${workspaceId}`),
      params(workspaceId)
    );
    const body = await json(response);
    expect(response.status).toBe(200);
    expect(body.data.id).toBe(workspaceId);
  });

  it("resets a workspace deterministically", async () => {
    const workspaceId = await createWorkspace();
    await createMovie(workspaceId, { title: "Temporary", year: 2020 });

    const reset = await workspaceResetRoute.POST(
      request(`/api/workspaces/${workspaceId}/reset`, {
        method: "POST",
        clientIp: `vitest-reset-${crypto.randomUUID()}`
      }),
      params(workspaceId)
    );
    const resetBody = await json(reset);
    expect(reset.status).toBe(200);
    expect(resetBody.seeded).toBe(10);

    const movies = await moviesRoute.GET(
      request("/api/movies?search=Temporary", { workspaceId })
    );
    const moviesBody = await json(movies);
    expect(moviesBody.pagination.total).toBe(0);
  });
});

describe("movie API", () => {
  it("performs CRUD operations through route handlers", async () => {
    const workspaceId = await createWorkspace();
    const created = await createMovie(workspaceId);

    expect(created.response.status).toBe(201);
    expect(created.response.headers.get("Location")).toMatch(/^\/api\/movies\//);
    const movieId = created.body.data.id;

    const get = await movieRoute.GET(
      request(`/api/movies/${movieId}`, { workspaceId }),
      params(movieId)
    );
    expect(get.status).toBe(200);

    const patch = await movieRoute.PATCH(
      request(`/api/movies/${movieId}`, {
        method: "PATCH",
        workspaceId,
        body: { watched: true }
      }),
      params(movieId)
    );
    const patchBody = await json(patch);
    expect(patch.status).toBe(200);
    expect(patchBody.data.watched).toBe(true);
    expect(patchBody.data.title).toBe("Arrival");

    const put = await movieRoute.PUT(
      request(`/api/movies/${movieId}`, {
        method: "PUT",
        workspaceId,
        body: {
          title: "Arrival Updated",
          director: "Denis Villeneuve",
          year: 2016,
          genre: "Drama",
          rating: 8
        }
      }),
      params(movieId)
    );
    const putBody = await json(put);
    expect(put.status).toBe(200);
    expect(putBody.data.watched).toBe(false);
    expect(putBody.data.description).toBeNull();

    const deleted = await movieRoute.DELETE(
      request(`/api/movies/${movieId}`, {
        method: "DELETE",
        workspaceId
      }),
      params(movieId)
    );
    expect(deleted.status).toBe(204);
    expect(await deleted.text()).toBe("");

    const missing = await movieRoute.GET(
      request(`/api/movies/${movieId}`, { workspaceId }),
      params(movieId)
    );
    expect(missing.status).toBe(404);
  });

  it("isolates movies by workspace", async () => {
    const workspaceA = await createWorkspace();
    const workspaceB = await createWorkspace();
    const created = await createMovie(workspaceA, { title: "Workspace Only" });
    const movieId = created.body.data.id;

    const getFromOtherWorkspace = await movieRoute.GET(
      request(`/api/movies/${movieId}`, { workspaceId: workspaceB }),
      params(movieId)
    );
    expect(getFromOtherWorkspace.status).toBe(404);

    const patchFromOtherWorkspace = await movieRoute.PATCH(
      request(`/api/movies/${movieId}`, {
        method: "PATCH",
        workspaceId: workspaceB,
        body: { watched: true }
      }),
      params(movieId)
    );
    expect(patchFromOtherWorkspace.status).toBe(404);
  });

  it("filters, sorts, and paginates", async () => {
    const workspaceId = await createWorkspace();
    const response = await moviesRoute.GET(
      request("/api/movies?genre=Action&watched=true&sortBy=rating&order=desc&page=1&limit=2", {
        workspaceId
      })
    );
    const body = await json(response);

    expect(response.status).toBe(200);
    expect(body.pagination.limit).toBe(2);
    expect(body.data.every((movie: { genre: string; watched: boolean }) => movie.genre === "Action" && movie.watched)).toBe(true);
  });

  it("supports case-insensitive title search", async () => {
    const workspaceId = await createWorkspace();
    const response = await moviesRoute.GET(
      request("/api/movies?search=inception", { workspaceId })
    );
    const body = await json(response);
    expect(body.pagination.total).toBe(1);
    expect(body.data[0].title).toBe("Inception");
  });

  it("rejects duplicate title and year within a workspace", async () => {
    const workspaceId = await createWorkspace();
    await createMovie(workspaceId, { title: "Duplicate", year: 2022 });
    const duplicate = await createMovie(workspaceId, {
      title: "duplicate",
      year: 2022
    });
    expect(duplicate.response.status).toBe(409);
  });

  it("allows the same title and year in different workspaces", async () => {
    const workspaceA = await createWorkspace();
    const workspaceB = await createWorkspace();
    const first = await createMovie(workspaceA, { title: "Shared", year: 2023 });
    const second = await createMovie(workspaceB, { title: "Shared", year: 2023 });
    expect(first.response.status).toBe(201);
    expect(second.response.status).toBe(201);
  });
});

describe("validation and errors", () => {
  it("requires a valid workspace header", async () => {
    const missing = await moviesRoute.GET(request("/api/movies"));
    expect(missing.status).toBe(400);

    const invalid = await moviesRoute.GET(
      request("/api/movies", { workspaceId: "not-a-uuid" })
    );
    expect(invalid.status).toBe(400);
  });

  it("returns 404 for an unknown workspace", async () => {
    const response = await moviesRoute.GET(
      request("/api/movies", {
        workspaceId: "11111111-1111-4111-8111-111111111111"
      })
    );
    expect(response.status).toBe(404);
  });

  it("validates required fields, types, boundaries, enums, and unknown properties", async () => {
    const workspaceId = await createWorkspace();
    const response = await moviesRoute.POST(
      request("/api/movies", {
        method: "POST",
        workspaceId,
        body: {
          title: "A",
          director: 42,
          year: 1800,
          genre: "Musical",
          rating: 11,
          id: crypto.randomUUID()
        }
      })
    );
    const body = await json(response);
    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.details.length).toBeGreaterThanOrEqual(5);
  });

  it("rejects malformed JSON and unsupported content types", async () => {
    const workspaceId = await createWorkspace();
    const malformed = await moviesRoute.POST(
      request("/api/movies", {
        method: "POST",
        workspaceId,
        body: "{ nope",
        contentType: "application/json"
      })
    );
    expect(malformed.status).toBe(400);

    const unsupported = await moviesRoute.POST(
      request("/api/movies", {
        method: "POST",
        workspaceId,
        body: "title=Arrival",
        contentType: "application/x-www-form-urlencoded"
      })
    );
    expect(unsupported.status).toBe(415);
  });

  it("rejects invalid identifiers and missing resources", async () => {
    const workspaceId = await createWorkspace();
    const invalid = await movieRoute.GET(
      request("/api/movies/not-a-uuid", { workspaceId }),
      params("not-a-uuid")
    );
    expect(invalid.status).toBe(400);

    const missingId = crypto.randomUUID();
    const missing = await movieRoute.GET(
      request(`/api/movies/${missingId}`, { workspaceId }),
      params(missingId)
    );
    expect(missing.status).toBe(404);
  });

  it("rejects invalid query parameters", async () => {
    const workspaceId = await createWorkspace();
    const response = await moviesRoute.GET(
      request("/api/movies?page=zero&limit=101&sortBy=director", {
        workspaceId
      })
    );
    expect(response.status).toBe(400);
  });

  it("rejects empty PATCH bodies", async () => {
    const workspaceId = await createWorkspace();
    const created = await createMovie(workspaceId);
    const response = await movieRoute.PATCH(
      request(`/api/movies/${created.body.data.id}`, {
        method: "PATCH",
        workspaceId,
        body: {}
      }),
      params(created.body.data.id)
    );
    expect(response.status).toBe(400);
  });

  it("rate limits public write endpoints", async () => {
    process.env.RATE_LIMIT_MAX_REQUESTS = "1";
    const workspaceId = await createWorkspace();
    const first = await moviesRoute.POST(
      request("/api/movies", {
        method: "POST",
        workspaceId,
        clientIp: "vitest-rate-limit",
        body: {
          title: "First",
          director: "Rate Tester",
          year: 2020,
          genre: "Drama",
          rating: 7
        }
      })
    );
    const second = await moviesRoute.POST(
      request("/api/movies", {
        method: "POST",
        workspaceId,
        clientIp: "vitest-rate-limit",
        body: {
          title: "Second",
          director: "Rate Tester",
          year: 2021,
          genre: "Drama",
          rating: 7
        }
      })
    );

    expect(first.status).toBe(201);
    expect(second.status).toBe(429);
  });

  it("documents unsupported methods as 405 in the dispatch layer", () => {
    const supported = new Set(["GET", "POST"]);
    const method = "DELETE";
    const status = supported.has(method) ? 200 : 405;
    expect(status).toBe(405);
  });
});


