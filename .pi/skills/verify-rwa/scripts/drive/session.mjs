import { createRequire } from "node:module";
import { VIEWPORT } from "./config.mjs";

// NODE_PATH (set by drive.sh) locates playwright for CommonJS resolution only.
const { chromium } = createRequire(import.meta.url)("playwright");

let browser;
let ctx;
let livePage;
let consoleErrors = [];

const firstLine = (text) => text.split("\n")[0];

function watchConsole(target) {
  target.on("console", (m) => {
    if (m.type() === "error") consoleErrors = [...consoleErrors, firstLine(m.text())];
  });
}

async function launch(headed) {
  browser = await chromium.launch({ headless: !headed });
}

const closeBrowser = () => browser.close();

// Fresh browser context = fresh cookies + localStorage, i.e. a different person on a different machine.
async function newSession() {
  if (ctx) await ctx.close();
  ctx = await browser.newContext({ viewport: VIEWPORT });
  livePage = await ctx.newPage();
  watchConsole(livePage);
  return ctx;
}

const currentPage = () => livePage;
const getConsoleErrors = () => consoleErrors;

// Journeys keep their `page.click(...)` shape; the proxy always forwards to the newest session's page.
const page = new Proxy(
  {},
  {
    get: (_target, key) => {
      const value = livePage[key];
      return typeof value === "function" ? value.bind(livePage) : value;
    },
  }
);

export { launch, closeBrowser, newSession, currentPage, getConsoleErrors, page, firstLine };
