import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { ApiError, fromZodError, validationError } from "./errors";

const MAX_BODY_BYTES = 64 * 1024;

export function jsonResponse<T>(
  body: T,
  status = 200,
  headers?: HeadersInit
) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      ...headers
    }
  });
}

export function emptyResponse(status = 204) {
  return new NextResponse(null, {
    status,
    headers: {
      "Cache-Control": "no-store"
    }
  });
}

export function errorResponse(error: unknown) {
  if (error instanceof ZodError) {
    return errorResponse(fromZodError(error));
  }

  if (error instanceof ApiError) {
    if (error.status >= 500) {
      console.error("[api] handled server error", {
        code: error.code,
        message: error.message,
        details: error.details
      });
    }
    return jsonResponse(
      {
        error: {
          code: error.code,
          message: error.message,
          ...(error.details ? { details: error.details } : {})
        }
      },
      error.status
    );
  }

  console.error("[api] unexpected server error", error);

  return jsonResponse(
    {
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected server error occurred"
      }
    },
    500
  );
}

export async function withApiErrorHandling(
  handler: () => Promise<Response>,
  context?: Record<string, unknown>
): Promise<Response> {
  try {
    return await handler();
  } catch (error) {
    if (context) {
      console.error("[api] request failed", context, error);
    }
    return errorResponse(error);
  }
}

export function requireJsonContentType(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new ApiError(
      415,
      "UNSUPPORTED_MEDIA_TYPE",
      "Requests with a body must use application/json"
    );
  }
}

function assertBodySize(rawBody: string) {
  if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
    throw validationError("Request body must be 64KB or smaller", [
      { field: "body", message: "Request body exceeds 64KB" }
    ]);
  }
}

function parseJsonText(rawBody: string) {
  try {
    return JSON.parse(rawBody) as unknown;
  } catch {
    throw validationError("Malformed JSON body", [
      { field: "body", message: "Body must contain valid JSON" }
    ]);
  }
}

export async function parseJsonBody(request: NextRequest) {
  requireJsonContentType(request);
  const rawBody = await request.text();
  assertBodySize(rawBody);

  if (!rawBody.trim()) {
    throw validationError("Request body is required", [
      { field: "body", message: "Expected a JSON object" }
    ]);
  }

  return parseJsonText(rawBody);
}

export async function parseOptionalJsonBody(request: NextRequest) {
  const rawBody = await request.text();
  assertBodySize(rawBody);

  if (!rawBody.trim()) {
    return undefined;
  }

  requireJsonContentType(request);
  return parseJsonText(rawBody);
}

export function getClientKey(request: NextRequest) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "local-client"
  );
}
