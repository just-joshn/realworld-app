import type { ConsoleMessage } from "@playwright/test";
import { test as base, expect } from "./base";

const ignoredBrowserErrors = [/favicon/i, /ResizeObserver loop/];

function consoleErrorText(message: ConsoleMessage) {
  const location = message.location();
  if (location.url.length === 0) return message.text();
  return `${message.text()} (${location.url}:${String(location.lineNumber)})`;
}

export const test = base.extend<{
  allowedBrowserErrors: RegExp[];
}>({
  allowedBrowserErrors: [[], { option: true }],
  page: async ({ page, allowedBrowserErrors }, use, testInfo) => {
    const ignored = [...ignoredBrowserErrors, ...allowedBrowserErrors];
    const isIgnored = (text: string) => ignored.some((pattern) => pattern.test(text));
    const errors: string[] = [];
    const onConsole = (message: ConsoleMessage) => {
      if (message.type() !== "error") return;
      const text = consoleErrorText(message);
      if (!isIgnored(text)) errors.push(text);
    };
    const onPageError = (error: Error) => {
      const text = error.stack ?? error.message;
      if (!isIgnored(text)) errors.push(text);
    };
    page.on("console", onConsole);
    page.on("pageerror", onPageError);
    await use(page);
    if (errors.length === 0) return;
    await testInfo.attach("browser-errors", {
      body: errors.join("\n"),
      contentType: "text/plain",
    });
    throw new Error(`Unexpected browser errors:\n${errors.join("\n")}`);
  },
});

export { expect };
