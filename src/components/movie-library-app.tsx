"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Clipboard,
  Film,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
  X
} from "lucide-react";
import { GENRES, type Genre, type MovieDto, type PaginatedMovies } from "@/types/movie";
import { clsx } from "clsx";

type Workspace = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

type InspectorEntry = {
  id: string;
  method: string;
  url: string;
  requestHeaders: Record<string, string>;
  requestBody: unknown;
  responseStatus: number;
  responseHeaders: Record<string, string>;
  responseBody: unknown;
  durationMs: number;
  timestamp: string;
};

type MovieFormState = {
  title: string;
  director: string;
  year: string;
  genre: Genre;
  rating: string;
  watched: boolean;
  description: string;
};

const STORAGE_KEY = "movie-library-workspace-id";
const blankForm: MovieFormState = {
  title: "",
  director: "",
  year: String(new Date().getFullYear()),
  genre: "Drama",
  rating: "7.0",
  watched: false,
  description: ""
};

function formatJson(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return "";
  }
  return JSON.stringify(value, null, 2);
}

function readJson(text: string) {
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function movieToForm(movie: MovieDto): MovieFormState {
  return {
    title: movie.title,
    director: movie.director,
    year: String(movie.year),
    genre: movie.genre,
    rating: String(movie.rating),
    watched: movie.watched,
    description: movie.description ?? ""
  };
}

export function MovieLibraryApp() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [movies, setMovies] = useState<MovieDto[]>([]);
  const [pagination, setPagination] = useState<PaginatedMovies["pagination"]>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  const [search, setSearch] = useState("");
  const [genre, setGenre] = useState("");
  const [watched, setWatched] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [order, setOrder] = useState("desc");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [initializingWorkspace, setInitializingWorkspace] = useState(true);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingMovie, setEditingMovie] = useState<MovieDto | null>(null);
  const [form, setForm] = useState<MovieFormState>(blankForm);
  const [deleteTarget, setDeleteTarget] = useState<MovieDto | null>(null);
  const [history, setHistory] = useState<InspectorEntry[]>([]);
  const [inspectorOpen, setInspectorOpen] = useState(true);

  const activeEntry = history[0];
  const workspaceReady = Boolean(workspace) && !initializingWorkspace;

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (genre) params.set("genre", genre);
    if (watched) params.set("watched", watched);
    params.set("sortBy", sortBy);
    params.set("order", order);
    params.set("page", String(page));
    params.set("limit", "10");
    return params.toString();
  }, [genre, order, page, search, sortBy, watched]);

  async function apiRequest<T>(
    method: string,
    url: string,
    options: { body?: unknown; workspaceId?: string } = {}
  ): Promise<T> {
    const headers: Record<string, string> = {};
    if (options.workspaceId) headers["X-Workspace-ID"] = options.workspaceId;
    if (options.body !== undefined) headers["Content-Type"] = "application/json";

    const started = performance.now();
    const response = await fetch(url, {
      method,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined
    });
    const text = await response.text();
    const responseBody = readJson(text);
    const entry: InspectorEntry = {
      id: crypto.randomUUID(),
      method,
      url,
      requestHeaders: headers,
      requestBody: options.body ?? null,
      responseStatus: response.status,
      responseHeaders: Object.fromEntries(response.headers.entries()),
      responseBody,
      durationMs: Math.round(performance.now() - started),
      timestamp: new Date().toISOString()
    };
    setHistory((current) => [entry, ...current].slice(0, 12));

    if (!response.ok) {
      const message =
        typeof responseBody === "object" &&
        responseBody &&
        "error" in responseBody &&
        typeof responseBody.error === "object" &&
        responseBody.error &&
        "message" in responseBody.error
          ? String(responseBody.error.message)
          : "API request failed";
      throw new Error(message);
    }

    return responseBody as T;
  }

  async function loadMovies(currentWorkspace = workspace) {
    if (!currentWorkspace) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const result = await apiRequest<PaginatedMovies>(
        "GET",
        `/api/movies?${queryString}`,
        { workspaceId: currentWorkspace.id }
      );
      setMovies(result.data);
      setPagination(result.pagination);
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Could not load movies" });
    } finally {
      setLoading(false);
    }
  }

  async function createNewWorkspace(showSuccess = true) {
    setInitializingWorkspace(true);
    setInitializationError(null);
    setLoading(true);
    try {
      const result = await apiRequest<{ workspace: Workspace; moviesSeeded: number }>(
        "POST",
        "/api/workspaces"
      );
      localStorage.setItem(STORAGE_KEY, result.workspace.id);
      setWorkspace(result.workspace);
      setPage(1);
      setInitializationError(null);
      setInitializingWorkspace(false);
      if (showSuccess) {
        setNotice({
          type: "success",
          text: `Workspace created with ${result.moviesSeeded} sample movies.`
        });
      }
      await loadMovies(result.workspace);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not create workspace";
      setWorkspace(null);
      setInitializationError(message);
      setNotice({ type: "error", text: message });
      setLoading(false);
      setInitializingWorkspace(false);
    }
  }

  useEffect(() => {
    async function boot() {
      setInitializingWorkspace(true);
      setInitializationError(null);
      const storedId = localStorage.getItem(STORAGE_KEY);
      if (storedId) {
        try {
          const result = await apiRequest<{ data: Workspace }>(
            "GET",
            `/api/workspaces/${storedId}`
          );
          setWorkspace(result.data);
          setInitializingWorkspace(false);
          return;
        } catch {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
      await createNewWorkspace(false);
    }
    void boot();
    // The boot flow should run once so it can restore or create the browser's workspace.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (workspace) {
      // This effect intentionally synchronizes the movie list with the active query.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void loadMovies(workspace);
    }
    // Reload only when the active workspace or list query changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryString, workspace?.id]);

  function openCreateForm() {
    if (!workspaceReady) {
      setNotice({ type: "error", text: "Workspace is not ready yet. Try again after initialization succeeds." });
      return;
    }
    setEditingMovie(null);
    setForm(blankForm);
    setFormOpen(true);
  }

  function openEditForm(movie: MovieDto) {
    setEditingMovie(movie);
    setForm(movieToForm(movie));
    setFormOpen(true);
  }

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!workspace) {
      setNotice({ type: "error", text: "Workspace is not ready yet. Retry workspace initialization before saving a movie." });
      return;
    }
    setSaving(true);
    const body = {
      title: form.title,
      director: form.director,
      year: Number(form.year),
      genre: form.genre,
      rating: Number(form.rating),
      watched: form.watched,
      description: form.description.trim() ? form.description.trim() : null
    };

    try {
      if (editingMovie) {
        await apiRequest("PUT", `/api/movies/${editingMovie.id}`, {
          workspaceId: workspace.id,
          body
        });
        setNotice({ type: "success", text: "Movie updated." });
      } else {
        await apiRequest("POST", "/api/movies", {
          workspaceId: workspace.id,
          body
        });
        setNotice({ type: "success", text: "Movie created." });
      }
      setFormOpen(false);
      await loadMovies(workspace);
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Could not save movie" });
    } finally {
      setSaving(false);
    }
  }

  async function toggleWatched(movie: MovieDto) {
    if (!workspace) return;
    try {
      await apiRequest("PATCH", `/api/movies/${movie.id}`, {
        workspaceId: workspace.id,
        body: { watched: !movie.watched }
      });
      setNotice({ type: "success", text: movie.watched ? "Marked as unwatched." : "Marked as watched." });
      await loadMovies(workspace);
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Could not update movie" });
    }
  }

  async function confirmDelete() {
    if (!workspace || !deleteTarget) return;
    try {
      await apiRequest("DELETE", `/api/movies/${deleteTarget.id}`, {
        workspaceId: workspace.id
      });
      setNotice({ type: "success", text: "Movie deleted." });
      setDeleteTarget(null);
      await loadMovies(workspace);
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Could not delete movie" });
    }
  }

  async function resetWorkspace() {
    if (!workspace) return;
    try {
      const result = await apiRequest<{ seeded: number }>(
        "POST",
        `/api/workspaces/${workspace.id}/reset`
      );
      setPage(1);
      setNotice({ type: "success", text: `Workspace reset with ${result.seeded} movies.` });
      await loadMovies(workspace);
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Could not reset workspace" });
    }
  }

  return (
    <main className="min-h-screen px-4 py-5 text-ink sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <header className="flex flex-col gap-4 rounded-lg border border-black/10 bg-white/80 p-4 shadow-soft backdrop-blur md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-lg bg-ink text-white">
              <Film size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-normal">Movie Library</h1>
              <p className="mt-1 text-sm text-gray-600">
                REST API training workspace for practical QA exercises.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center">
            <span className="rounded-md border border-black/10 bg-paper px-3 py-2 font-mono text-xs">
              {workspace ? workspace.id : initializingWorkspace ? "Creating workspace..." : "Workspace unavailable"}
            </span>
            <button
              className="inline-flex items-center justify-center gap-2 rounded-md bg-ink px-3 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={openCreateForm}
              disabled={!workspaceReady}
            >
              <Plus size={16} /> Add Movie
            </button>
            <button
              className="inline-flex items-center justify-center gap-2 rounded-md border border-black/10 bg-white px-3 py-2 text-sm font-medium hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => createNewWorkspace(true)}
              disabled={initializingWorkspace}
            >
              <Plus size={16} /> New Workspace
            </button>
            <button
              className="inline-flex items-center justify-center gap-2 rounded-md border border-black/10 bg-white px-3 py-2 text-sm font-medium hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={resetWorkspace}
              disabled={!workspaceReady}
            >
              <RefreshCcw size={16} /> Reset
            </button>
          </div>
        </header>

        {initializationError ? (
          <div className="flex flex-col gap-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 sm:flex-row sm:items-center sm:justify-between">
            <span>Workspace initialization failed: {initializationError}</span>
            <button
              className="rounded-md bg-red-700 px-3 py-2 font-medium text-white disabled:opacity-50"
              onClick={() => createNewWorkspace(true)}
              disabled={initializingWorkspace}
            >
              Retry
            </button>
          </div>
        ) : null}

        {notice ? (
          <div
            className={clsx(
              "flex items-center justify-between rounded-md border px-4 py-3 text-sm",
              notice.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-red-200 bg-red-50 text-red-900"
            )}
          >
            <span>{notice.text}</span>
            <button aria-label="Dismiss notification" onClick={() => setNotice(null)}>
              <X size={16} />
            </button>
          </div>
        ) : null}

        <section className="grid gap-5 lg:grid-cols-[1fr_420px]">
          <div className="flex flex-col gap-4">
            <div className="grid gap-3 rounded-lg border border-black/10 bg-white/85 p-4 shadow-soft md:grid-cols-[1.5fr_1fr_1fr_1fr_auto]">
              <label className="flex items-center gap-2 rounded-md border border-black/10 bg-white px-3 py-2">
                <Search size={16} className="text-gray-500" />
                <input
                  className="w-full bg-transparent outline-none disabled:cursor-not-allowed"
                  placeholder="Search title"
                  value={search}
                  disabled={!workspaceReady}
                  onChange={(event) => {
                    setPage(1);
                    setSearch(event.target.value);
                  }}
                />
              </label>
              <select className="rounded-md border border-black/10 bg-white px-3 py-2 disabled:cursor-not-allowed disabled:opacity-60" disabled={!workspaceReady} value={genre} onChange={(event) => { setPage(1); setGenre(event.target.value); }}>
                <option value="">All genres</option>
                {GENRES.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
              <select className="rounded-md border border-black/10 bg-white px-3 py-2 disabled:cursor-not-allowed disabled:opacity-60" disabled={!workspaceReady} value={watched} onChange={(event) => { setPage(1); setWatched(event.target.value); }}>
                <option value="">Any status</option>
                <option value="true">Watched</option>
                <option value="false">Unwatched</option>
              </select>
              <select className="rounded-md border border-black/10 bg-white px-3 py-2 disabled:cursor-not-allowed disabled:opacity-60" disabled={!workspaceReady} value={`${sortBy}:${order}`} onChange={(event) => {
                const [field, direction] = event.target.value.split(":");
                setSortBy(field);
                setOrder(direction);
              }}>
                <option value="createdAt:desc">Newest</option>
                <option value="title:asc">Title A-Z</option>
                <option value="year:desc">Year high-low</option>
                <option value="rating:desc">Rating high-low</option>
              </select>
              <button
                className="rounded-md border border-black/10 bg-white px-3 py-2 font-medium hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!workspaceReady}
                onClick={() => {
                  setSearch("");
                  setGenre("");
                  setWatched("");
                  setSortBy("createdAt");
                  setOrder("desc");
                  setPage(1);
                }}
              >
                Clear
              </button>
            </div>

            <div className="overflow-hidden rounded-lg border border-black/10 bg-white/90 shadow-soft">
              {loading ? (
                <div className="p-8 text-center text-gray-600">Loading movies...</div>
              ) : movies.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-lg font-semibold">No movies found</p>
                  <p className="mt-1 text-sm text-gray-600">Create a movie or adjust the filters.</p>
                </div>
              ) : (
                <div className="divide-y divide-black/10">
                  {movies.map((movie) => (
                    <article key={movie.id} className="grid gap-3 p-4 md:grid-cols-[1fr_auto] md:items-center">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-lg font-semibold">{movie.title}</h2>
                          <span className="rounded-md bg-paper px-2 py-1 text-xs font-medium">{movie.genre}</span>
                          <span className={clsx("rounded-md px-2 py-1 text-xs font-medium", movie.watched ? "bg-emerald-100 text-emerald-900" : "bg-gray-100 text-gray-700")}>
                            {movie.watched ? "Watched" : "Unwatched"}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-gray-600">
                          {movie.director} - {movie.year} - Rating {movie.rating.toFixed(1)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button className="inline-flex items-center gap-2 rounded-md border border-black/10 px-3 py-2 text-sm hover:bg-gray-50" onClick={() => toggleWatched(movie)}>
                          <Check size={15} /> {movie.watched ? "Unwatch" : "Watched"}
                        </button>
                        <button className="rounded-md border border-black/10 px-3 py-2 text-sm hover:bg-gray-50" onClick={() => openEditForm(movie)}>
                          Edit
                        </button>
                        <button className="inline-flex items-center gap-2 rounded-md border border-red-200 px-3 py-2 text-sm text-red-700 hover:bg-red-50" onClick={() => setDeleteTarget(movie)}>
                          <Trash2 size={15} /> Delete
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between rounded-lg border border-black/10 bg-white/80 px-4 py-3 text-sm">
              <span>
                Page {pagination.page} of {Math.max(pagination.totalPages, 1)} - {pagination.total} movies
              </span>
              <div className="flex gap-2">
                <button className="rounded-md border border-black/10 px-3 py-2 disabled:opacity-40" disabled={page <= 1 || !workspaceReady} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</button>
                <button className="rounded-md border border-black/10 px-3 py-2 disabled:opacity-40" disabled={page >= Math.max(pagination.totalPages, 1) || !workspaceReady} onClick={() => setPage((value) => value + 1)}>Next</button>
              </div>
            </div>
          </div>

          <aside className="rounded-lg border border-black/10 bg-[#101820] text-white shadow-soft">
            <button
              className="flex w-full items-center justify-between px-4 py-3 text-left font-semibold"
              onClick={() => setInspectorOpen((value) => !value)}
            >
              API Request Inspector
              {inspectorOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
            {inspectorOpen ? (
              <div className="border-t border-white/10 p-4">
                <div className="mb-3 flex items-center justify-between text-sm text-white/70">
                  <span>{history.length} requests this session</span>
                  <button className="rounded-md border border-white/15 px-2 py-1 hover:bg-white/10" onClick={() => setHistory([])}>
                    Clear
                  </button>
                </div>
                {activeEntry ? (
                  <InspectorDetails entry={activeEntry} />
                ) : (
                  <p className="text-sm text-white/70">Perform an action to inspect the actual HTTP request and response.</p>
                )}
              </div>
            ) : null}
          </aside>
        </section>
      </div>

      {formOpen ? (
        <div className="fixed inset-0 z-20 grid place-items-center bg-black/35 p-4">
          <form className="max-h-[92vh] w-full max-w-2xl overflow-auto rounded-lg bg-white p-5 shadow-soft" onSubmit={submitForm}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">{editingMovie ? "Edit Movie" : "Add Movie"}</h2>
              <button type="button" aria-label="Close form" onClick={() => setFormOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Title"><input required minLength={2} maxLength={100} className="w-full rounded-md border border-black/10 px-3 py-2" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></Field>
              <Field label="Director"><input required minLength={2} maxLength={100} className="w-full rounded-md border border-black/10 px-3 py-2" value={form.director} onChange={(event) => setForm({ ...form, director: event.target.value })} /></Field>
              <Field label="Year"><input required type="number" min={1888} max={new Date().getFullYear()} className="w-full rounded-md border border-black/10 px-3 py-2" value={form.year} onChange={(event) => setForm({ ...form, year: event.target.value })} /></Field>
              <Field label="Genre"><select className="w-full rounded-md border border-black/10 px-3 py-2" value={form.genre} onChange={(event) => setForm({ ...form, genre: event.target.value as Genre })}>{GENRES.map((item) => <option key={item} value={item}>{item}</option>)}</select></Field>
              <Field label="Rating"><input required type="number" min={0} max={10} step={0.1} className="w-full rounded-md border border-black/10 px-3 py-2" value={form.rating} onChange={(event) => setForm({ ...form, rating: event.target.value })} /></Field>
              <label className="flex items-center gap-2 pt-7 text-sm font-medium">
                <input type="checkbox" checked={form.watched} onChange={(event) => setForm({ ...form, watched: event.target.checked })} />
                Watched
              </label>
              <Field label="Description" className="sm:col-span-2">
                <textarea maxLength={1000} rows={4} className="w-full rounded-md border border-black/10 px-3 py-2" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
              </Field>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="rounded-md border border-black/10 px-4 py-2" onClick={() => setFormOpen(false)}>Cancel</button>
              <button disabled={saving || !workspaceReady} className="rounded-md bg-ink px-4 py-2 font-medium text-white disabled:opacity-50">
                {saving ? "Saving..." : "Save Movie"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="fixed inset-0 z-30 grid place-items-center bg-black/35 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-soft">
            <h2 className="text-lg font-semibold">Delete {deleteTarget.title}?</h2>
            <p className="mt-2 text-sm text-gray-600">This removes the movie from the active anonymous workspace.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button className="rounded-md border border-black/10 px-4 py-2" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="rounded-md bg-red-700 px-4 py-2 font-medium text-white" onClick={confirmDelete}>Delete</button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function Field({
  label,
  children,
  className
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={clsx("text-sm font-medium", className)}>
      <span className="mb-1 block">{label}</span>
      {children}
    </label>
  );
}

function InspectorDetails({ entry }: { entry: InspectorEntry }) {
  return (
    <div className="space-y-3 text-sm">
      <div className="rounded-md bg-white/10 p-3">
        <div className="font-mono text-xs text-white/70">{entry.timestamp}</div>
        <div className="mt-1 font-semibold">
          {entry.method} {entry.url}
        </div>
        <div className="text-white/70">
          Status {entry.responseStatus} - {entry.durationMs}ms
        </div>
      </div>
      <JsonBlock title="Request headers" value={entry.requestHeaders} />
      <JsonBlock title="Request body" value={entry.requestBody} emptyText="No request body" />
      <JsonBlock title="Response headers" value={entry.responseHeaders} />
      <JsonBlock title="Response body" value={entry.responseBody} emptyText="No response body" />
    </div>
  );
}

function JsonBlock({
  title,
  value,
  emptyText = "Empty"
}: {
  title: string;
  value: unknown;
  emptyText?: string;
}) {
  const text = formatJson(value);
  return (
    <div className="rounded-md border border-white/10">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
        <span className="font-medium">{title}</span>
        <button
          className="inline-flex items-center gap-1 rounded-md border border-white/15 px-2 py-1 text-xs hover:bg-white/10"
          onClick={() => navigator.clipboard.writeText(text)}
          disabled={!text}
        >
          <Clipboard size={13} /> Copy
        </button>
      </div>
      <pre className="max-h-56 overflow-auto bg-black/25 p-3 font-mono text-xs text-emerald-100">
        {text || emptyText}
      </pre>
    </div>
  );
}
