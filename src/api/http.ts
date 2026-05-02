import type { ApiErrorPayload } from "../domain/types";

export class ApiError extends Error {
  readonly status: number;
  readonly payload?: ApiErrorPayload | unknown;

  constructor(message: string, status: number, payload?: ApiErrorPayload | unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

export type ApiClientOptions = {
  baseUrl: string;
  token?: string;
  correlationId?: string;
};

export class ApiClient {
  private baseUrl: string;
  private token?: string;
  private correlationId?: string;

  constructor(options: ApiClientOptions) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl);
    this.token = options.token;
    this.correlationId = options.correlationId;
  }

  setToken(token?: string) {
    this.token = token;
  }

  setBaseUrl(baseUrl: string) {
    this.baseUrl = normalizeBaseUrl(baseUrl);
  }

  async get<T>(path: string) {
    return this.request<T>(path, { method: "GET" });
  }

  async post<T>(path: string, body?: unknown) {
    return this.request<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) });
  }

  async put<T>(path: string, body?: unknown) {
    return this.request<T>(path, { method: "PUT", body: body === undefined ? undefined : JSON.stringify(body) });
  }

  async delete<T = void>(path: string) {
    return this.request<T>(path, { method: "DELETE" });
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set("Accept", "application/json");
    if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    if (this.token) headers.set("Authorization", `Bearer ${this.token}`);
    if (this.correlationId) headers.set("X-Correlation-Id", this.correlationId);

    const url = `${this.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
    const response = await fetch(url, { ...init, headers });
    const text = await response.text();
    const payload = text ? safeJson(text) : undefined;

    if (!response.ok) {
      const message = extractMessage(payload) ?? `${response.status} ${response.statusText}`;
      throw new ApiError(message, response.status, payload);
    }

    return payload as T;
  }
}

function normalizeBaseUrl(baseUrl: string) {
  const trimmed = (baseUrl || "/").trim();
  return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
}

function safeJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function extractMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") return undefined;
  const value = payload as ApiErrorPayload;
  if (value.message) return value.message;
  if (value.title) return value.title;
  if (value.errors) return Object.entries(value.errors).map(([field, errors]) => `${field}: ${errors.join(", ")}`).join(" · ");
  return undefined;
}
