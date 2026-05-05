import { CSRF_COOKIE, CSRF_HEADER, generateCsrfToken } from "@/lib/http/csrf";

const TEST_CSRF_TOKEN = generateCsrfToken();

/**
 * Build a Request with the CSRF cookie + header attached.
 * Route handlers receive this directly — middleware is bypassed in unit tests.
 */
export function makeRequest(
  method: string,
  url: string,
  body?: unknown,
  options?: { headers?: Record<string, string> },
): Request {
  const headers: Record<string, string> = {
    ...(options?.headers ?? {}),
    [CSRF_HEADER]: TEST_CSRF_TOKEN,
    cookie: `${CSRF_COOKIE}=${TEST_CSRF_TOKEN}`,
  };

  if (body !== undefined) {
    headers["content-type"] = "application/json";
  }

  return new Request(`http://localhost${url}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export function getJson(url: string): Request {
  return makeRequest("GET", url);
}

export function postJson(url: string, body: unknown): Request {
  return makeRequest("POST", url, body);
}

export function putJson(url: string, body: unknown): Request {
  return makeRequest("PUT", url, body);
}

export function patchJson(url: string, body: unknown): Request {
  return makeRequest("PATCH", url, body);
}

export function deleteRequest(url: string): Request {
  return makeRequest("DELETE", url);
}

export async function readJson<T = unknown>(res: Response): Promise<T> {
  return (await res.json()) as T;
}
