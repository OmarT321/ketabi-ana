import { getLessons, notice } from "@platform/core/server";
import { json } from "@platform/core/http";
import { photoAllowed } from "@platform/core/illustrations";
export const dynamic = "force-dynamic";
export async function GET() {
  return json({ lessons: await getLessons(), reviewNotice: notice, allowUpload: photoAllowed() });
}
