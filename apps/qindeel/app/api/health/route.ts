import { json } from "@platform/core/http";
import { readiness } from "@platform/core/server";
export const dynamic = "force-dynamic";
export async function GET() {
  return json({
    status: "ok",
    service: "qindeel",
    release: "0.1.0",
    ...readiness(),
  });
}
