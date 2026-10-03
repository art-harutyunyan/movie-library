# Movie Library Training Guide

This guide uses the Movie Library website, Swagger UI at `/api-docs`, and the included Postman collection to practice REST API testing. Anonymous workspace IDs separate training data, but they are not secure authentication. Anyone with a workspace ID can read, modify, delete, or reset that workspace.

## Module 1: REST API Fundamentals

Goal: understand requests and responses.

Assignments:

1. Open the website and create a new workspace.
2. In the API request inspector, identify the HTTP method, URL, request headers, response status, and response body for `POST /api/workspaces`.
3. Open Swagger UI at `/api-docs` and find the `X-Workspace-ID` header requirement for movie endpoints.
4. In Postman, call `GET /api/movies` with and without `X-Workspace-ID`.

Expected outcomes:

- With a valid workspace header, `GET /api/movies` returns `200`.
- Without the header, the API returns `400` with `VALIDATION_ERROR`.
- Response timestamps are ISO 8601 strings in UTC.

## Module 2: CRUD Testing

Goal: verify create, read, update, and delete behavior.

Assignments:

1. Create a movie from the UI and inspect the generated `POST /api/movies` request.
2. Reproduce the same request in Postman.
3. Save the returned `id`, then call `GET /api/movies/{id}`.
4. Use `PUT /api/movies/{id}` to replace the movie. Omit `watched` and `description`.
5. Use `PATCH /api/movies/{id}` to update only `watched`.
6. Delete the movie with `DELETE /api/movies/{id}`.
7. Call `GET /api/movies/{id}` again.

Expected outcomes:

- Create returns `201` and a `Location` header.
- `PUT` returns `200`, applies full replacement, and defaults omitted optional fields.
- `PATCH` returns `200` and changes only supplied fields.
- Delete returns `204` with no response body.
- A deleted movie returns `404`.

## Module 3: Negative Testing

Goal: practice invalid input testing with equivalence partitioning and boundary value analysis.

Assignments:

1. Submit movie titles with lengths 1, 2, 100, and 101.
2. Submit years 1887, 1888, the current year, and next year.
3. Submit ratings -0.1, 0, 10, and 10.1.
4. Submit an unsupported genre such as `Musical`.
5. Submit `rating` as a string instead of a number.
6. Try to send server-managed fields such as `id`, `workspaceId`, `createdAt`, or `updatedAt`.
7. Send malformed JSON.
8. Send a JSON body with `Content-Type: text/plain`.

Expected outcomes:

- Invalid partitions return `400` validation errors.
- Unsupported content type returns `415`.
- Duplicate title and year within the same workspace returns `409`.
- Public error responses do not expose stack traces or database details.

## Module 4: Advanced API Testing

Goal: verify query behavior and workspace isolation.

Assignments:

1. Call `GET /api/movies?genre=Drama`.
2. Call `GET /api/movies?watched=true`.
3. Call `GET /api/movies?search=inception`.
4. Call `GET /api/movies?sortBy=rating&order=desc`.
5. Call `GET /api/movies?page=1&limit=3`, then page 2.
6. Create two workspaces. Create a movie in workspace A, then try to retrieve, update, and delete it using workspace B's ID.
7. Reset a workspace and verify the seed dataset is restored.

Expected outcomes:

- Filters can be combined.
- Title search is case-insensitive.
- Pagination metadata matches the returned data.
- Workspace B cannot access or modify workspace A's movies and receives `404`.
- Reset always restores the same seed dataset.

## Module 5: API Automation

Goal: use Postman assertions to automate checks.

Assignments:

1. Import `postman/MovieLibrary.postman_collection.json`.
2. Run the workspace creation request and confirm `workspaceId` is saved automatically.
3. Run the movie creation request and confirm `movieId` is saved automatically.
4. Run the collection in order.
5. Add one new assertion that verifies `rating` is between 0 and 10.
6. Add one negative request for an invalid UUID.

Expected outcomes:

- Automated tests verify `201`, valid IDs, `200`, `204`, and `404` responses.
- IDs are passed between requests using collection variables.
- The same collection works locally and against a deployed Vercel URL by changing `baseUrl`.
