import { describe, expect, test, vi } from "vitest";
import { startService } from "../../test/machines";
import { dataMachine } from "./dataMachine";

type Item = { id: string };

const results = (...ids: string[]) => ids.map((id) => ({ id }));

function itemsMachine(services: Partial<Record<string, () => Promise<unknown>>> = {}) {
  return dataMachine<Item>("items").withConfig({
    services: {
      fetchData: () => Promise.resolve({ results: results("a", "b"), pageData: { page: 1 } }),
      createData: () => Promise.resolve({}),
      updateData: () => Promise.resolve({}),
      deleteData: () => Promise.resolve({}),
      ...services,
    },
  });
}

describe("dataMachine", () => {
  test("FETCH loads results and page data", async () => {
    const service = startService(itemsMachine());

    service.send("FETCH");

    await expect.poll(() => service.getSnapshot().value).toEqual({ success: "withData" });
    expect(service.getSnapshot().context).toMatchObject({
      results: results("a", "b"),
      pageData: { page: 1 },
    });
  });

  test("an empty result ends in success.withoutData", async () => {
    const service = startService(
      itemsMachine({ fetchData: () => Promise.resolve({ results: [], pageData: { page: 1 } }) })
    );

    service.send("FETCH");

    await expect.poll(() => service.getSnapshot().value).toEqual({ success: "withoutData" });
  });

  test("later pages are appended to the loaded results", async () => {
    const fetchData = vi
      .fn()
      .mockResolvedValueOnce({ results: results("a"), pageData: { page: 1 } })
      .mockResolvedValueOnce({ results: results("b"), pageData: { page: 2 } });
    const service = startService(itemsMachine({ fetchData }));

    service.send("FETCH");
    await expect.poll(() => service.getSnapshot().matches("success")).toBe(true);
    service.send("FETCH");

    await expect.poll(() => service.getSnapshot().context.results).toEqual(results("a", "b"));
  });

  test("a failed fetch ends in failure and FETCH retries", async () => {
    const fetchData = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({ results: results("a") });
    const service = startService(itemsMachine({ fetchData }));

    service.send("FETCH");
    await expect.poll(() => service.getSnapshot().value).toBe("failure");
    service.send("FETCH");

    await expect.poll(() => service.getSnapshot().value).toEqual({ success: "withData" });
  });

  test.for(["CREATE", "UPDATE", "DELETE"] as const)(
    "%s from idle runs the change and then reloads",
    async (type) => {
      const change = vi.fn(() => Promise.resolve({}));
      const service = startService(
        itemsMachine({ createData: change, updateData: change, deleteData: change })
      );

      service.send(type);

      await expect.poll(() => service.getSnapshot().value).toEqual({ success: "withData" });
      expect(change).toHaveBeenCalledOnce();
    }
  );

  test.for(["CREATE", "UPDATE", "DELETE"] as const)(
    "%s after a successful load runs the change and then reloads",
    async (type) => {
      const change = vi.fn(() => Promise.resolve({}));
      const service = startService(
        itemsMachine({ createData: change, updateData: change, deleteData: change })
      );
      service.send("FETCH");
      await expect.poll(() => service.getSnapshot().matches("success")).toBe(true);

      service.send(type);

      await expect.poll(() => change.mock.calls.length).toBe(1);
      await expect.poll(() => service.getSnapshot().value).toEqual({ success: "withData" });
    }
  );

  test.for(["CREATE", "UPDATE", "DELETE"] as const)(
    "%s while a load is in flight runs the change and then reloads",
    async (type) => {
      let finishFirstLoad = () => {};
      const fetchData = vi
        .fn()
        .mockImplementationOnce(
          () =>
            new Promise((resolve) => {
              finishFirstLoad = () => {
                resolve({ results: [] });
              };
            })
        )
        .mockResolvedValue({ results: results("a") });
      const change = vi.fn(() => Promise.resolve({}));
      const service = startService(
        itemsMachine({ fetchData, createData: change, updateData: change, deleteData: change })
      );
      service.send("FETCH");
      expect(service.getSnapshot().value).toBe("loading");

      service.send(type);
      finishFirstLoad();

      await expect.poll(() => change.mock.calls.length).toBe(1);
      await expect.poll(() => service.getSnapshot().context.results).toEqual(results("a"));
    }
  );

  test.for(["CREATE", "UPDATE", "DELETE"] as const)("a failed %s ends in failure", async (type) => {
    const fail = () => Promise.reject(new Error("rejected"));
    const service = startService(
      itemsMachine({ createData: fail, updateData: fail, deleteData: fail })
    );

    service.send(type);

    await expect.poll(() => service.getSnapshot().value).toBe("failure");
  });
});
