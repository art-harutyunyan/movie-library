import { jsonResponse } from "@/server/http";
import { openApiSpec } from "@/lib/openapi";

export async function GET() {
  return jsonResponse(openApiSpec);
}
