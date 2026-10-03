import { NextRequest } from "next/server";
import { getClientKey, jsonResponse, withApiErrorHandling } from "@/server/http";
import { enforceRateLimit } from "@/server/rate-limit";
import { resetWorkspace } from "@/server/services/workspaces";
import { parseUuid } from "@/server/validation";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: Params) {
  return withApiErrorHandling(async () => {
    const { id } = await context.params;
    const workspaceId = parseUuid(id);
    await enforceRateLimit(`workspace:reset:${workspaceId}:${getClientKey(request)}`);
    const result = await resetWorkspace(workspaceId);
    return jsonResponse(result);
  }, { route: "POST /api/workspaces/{id}/reset" });
}
