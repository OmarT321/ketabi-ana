export async function request<T>(
  path: string,
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(path, {
    method: body === undefined ? "GET" : "POST",
    headers:
      body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: signal ?? AbortSignal.timeout(90000),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(
      typeof error?.error === "string"
        ? error.error
        : response.status === 429
          ? "وصلنا إلى الحد المتاح الآن. انتظر قليلًا ثم حاول مجددًا."
          : "تعذّر الاتصال بالخادم. حاول مرة أخرى بعد قليل.",
    );
  }
  return response.json() as Promise<T>;
}
