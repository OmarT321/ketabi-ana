import { getLessons, notice } from "@platform/core/server";
import { json } from "@platform/core/http";
export const dynamic = "force-dynamic";
export async function GET() {
  return json({ lessons: await getLessons(), reviewNotice: notice });
}
