import { test, expect } from "../fixtures/base";

test.describe("GET /", { tag: "@api" }, () => {
  test("identifies the backend", async ({ request }) => {
    const response = await request.get("/");

    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("text/html");
    expect(await response.text()).toBe("Cypress Realworld App - backend");
  });

  test("lets the web app call it with credentials through CORS", async ({ request, webURL }) => {
    const response = await request.fetch("/checkAuth", {
      method: "OPTIONS",
      headers: { Origin: webURL, "Access-Control-Request-Method": "GET" },
    });

    expect(response.status()).toBe(204);
    expect(response.headers()["access-control-allow-origin"]).toBe(webURL);
    expect(response.headers()["access-control-allow-credentials"]).toBe("true");
  });
});
