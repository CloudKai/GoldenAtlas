export const errorResponse = (status: number, code: string, message: string) =>
  Response.json({ error: { code, message } }, { status });

export const isUuid = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

export const readExactUuid = async (req: Request, key: string): Promise<string | null> => {
  if (req.method !== "POST") return null;
  try {
    const body = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) return null;
    const keys = Object.keys(body);
    const value = (body as Record<string, unknown>)[key];
    return keys.length === 1 && keys[0] === key && isUuid(value) ? value : null;
  } catch {
    return null;
  }
};

export const logOutcome = (
  requestId: string,
  functionName: string,
  outcome: "success" | "failure",
  startedAt: number,
  errorCode?: string,
) => {
  const payload = {
    request_id: requestId,
    function: functionName,
    outcome,
    ...(errorCode ? { error_code: errorCode } : {}),
    duration_ms: Math.round(performance.now() - startedAt),
  };
  const line = JSON.stringify(payload);
  if (outcome === "success") console.info(line);
  else console.error(line);
};
