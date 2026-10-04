import fs from "node:fs";
import { createHash } from "node:crypto";
import { lessons } from "../packages/core/content";
import { canonicalJson } from "../packages/core/server";
const quote = (s: string) => `'${s.replaceAll("'", "''")}'`;
const rows = lessons.map((payload) => {
  const value = canonicalJson(payload);
  const hash = createHash("sha256").update(value).digest("hex");
  return `(${quote(payload.id)},'lesson',${quote(value)}::jsonb,${quote(hash)})`;
});
fs.writeFileSync(
  "supabase/seed.sql",
  `insert into public.content_items(id,kind,payload,content_hash) values\n${rows.join(",\n")}\non conflict(id) do update set payload=excluded.payload,content_hash=excluded.content_hash where content_items.status='pending';\n`,
);
