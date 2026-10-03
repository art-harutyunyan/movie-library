import { NextRequest } from "next/server";
import { createWorkspace } from "@/server/services/workspaces";
import { enforceRateLimit } from "@/server/rate-limit";
import {
  getClientKey,
  jsonResponse,
  parseOptionalJsonBody,
  withApiErrorHandling
} from "@/server/http";

export async function POST(request: NextRequest) {
  return withApiErrorHandling(async () => {
    await enforceRateLimit(`workspace:create:${getClientKey(request)}`);
    const body = await parseOptionalJsonBody(request);
    const result = await createWorkspace(body);

    return jsonResponse(result, 201, {
      Location: `/api/workspaces/${result.workspace.id}`
    });
  }, { route: "POST /api/workspaces" });
}

