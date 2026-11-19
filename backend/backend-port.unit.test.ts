import { describe, expect, test, vi } from "vitest";
import { backendPort } from "../src/utils/portUtils";
import { getBackendPort } from "./backend-port";

// detect-port is overloaded; a typed mock avoids vi.mocked picking the callback overload.
const detectMock = vi.hoisted(() => vi.fn<(port: number) => Promise<number>>());
vi.mock("detect-port", () => ({ default: detectMock }));

describe("getBackendPort", () => {
  test("reads the backend port from VITE_BACKEND_PORT", () => {
    expect(backendPort).toBe("3001");
  });

  test("returns the configured port when it is free", async () => {
    detectMock.mockResolvedValue(3001);
    const log = vi.spyOn(console, "log").mockImplementation(() => {});

    await expect(getBackendPort()).resolves.toBe(3001);
    expect(detectMock).toHaveBeenCalledWith(3001);
    expect(log).toHaveBeenCalledWith(expect.stringContaining("running at http://localhost:3001"));
  });

  test("returns the next free port and warns when the configured port is taken", async () => {
    detectMock.mockResolvedValue(3002);
    const log = vi.spyOn(console, "log").mockImplementation(() => {});

    await expect(getBackendPort()).resolves.toBe(3002);
    expect(log).toHaveBeenCalledWith(
      expect.stringContaining("Please update VITE_BACKEND_PORT in the .env file to 3002")
    );
  });

  test("logs the error and resolves undefined when port detection fails", async () => {
    detectMock.mockRejectedValue(new Error("EACCES"));
    const log = vi.spyOn(console, "log").mockImplementation(() => {});

    await expect(getBackendPort()).resolves.toBeUndefined();
    expect(log).toHaveBeenCalledWith(expect.stringContaining("EACCES"));
  });
});
