import { NextRequest } from "next/server";
import { jsonResponse, withApiErrorHandling } from "@/server/http";
import { getWorkspace } from "@/server/services/workspaces";
import { parseUuid } from "@/server/validation";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: Params) {
  return withApiErrorHandling(async () => {
    const { id } = await context.params;
    const workspace = await getWorkspace(parseUuid(id));
    return jsonResponse({ data: workspace });
  }, { route: "GET /api/workspaces/{id}" });
}
