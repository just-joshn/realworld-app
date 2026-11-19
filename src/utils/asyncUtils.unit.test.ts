import { http, HttpResponse } from "msw";
import { describe, expect, test, vi } from "vitest";
import { server } from "../../test/msw";
import { createMemoryStorage } from "../../test/memoryStorage";
import { getAuthTokenName, httpClient } from "./asyncUtils";
import { apiUrl } from "./apiConfig";

const url = apiUrl("/checkAuth");

function captureAuthorizationHeader() {
  const received = vi.fn<(authorization: string | null) => void>();
  server.use(
    http.get(url, ({ request }) => {
      received(request.headers.get("authorization"));
      return HttpResponse.json({ ok: true });
    })
  );
  return received;
}

describe("getAuthTokenName", () => {
  test("returns the configured token name", () => {
    vi.stubEnv("VITE_AUTH_TOKEN_NAME", "authAccessToken");

    expect(getAuthTokenName()).toBe("authAccessToken");
  });

  test("throws when the token name is not configured", () => {
    vi.stubEnv("VITE_AUTH_TOKEN_NAME", undefined);

    expect(() => getAuthTokenName()).toThrow("VITE_AUTH_TOKEN_NAME is required");
  });
});

describe("httpClient", () => {
  test("sends no Authorization header with the local auth strategy", async () => {
    const received = captureAuthorizationHeader();

    const response = await httpClient.get(url);

    expect(response.data).toEqual({ ok: true });
    expect(received).toHaveBeenCalledExactlyOnceWith(null);
  });

  test.for(["VITE_AUTH0", "VITE_OKTA", "VITE_AWS_COGNITO", "VITE_GOOGLE"])(
    "sends the stored bearer token when %s is enabled",
    async (provider) => {
      vi.stubEnv(provider, "true");
      vi.stubEnv("VITE_AUTH_TOKEN_NAME", "authAccessToken");
      vi.stubGlobal("localStorage", createMemoryStorage({ authAccessToken: "token-123" }));
      const received = captureAuthorizationHeader();

      await httpClient.get(url);

      expect(received).toHaveBeenCalledExactlyOnceWith("Bearer token-123");
    }
  );
});
