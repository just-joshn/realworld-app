const { chromium } = require("playwright");
const { VIEWPORT } = require("./config.cjs");

let browser;
let ctx;
let page;
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
  page = await ctx.newPage();
  watchConsole(page);
  return ctx;
}

const currentPage = () => page;
const getConsoleErrors = () => consoleErrors;

// Journeys keep their `page.click(...)` shape; the proxy always forwards to the newest session's page.
const pageProxy = new Proxy(
  {},
  {
    get: (_target, key) => {
      const value = page[key];
      return typeof value === "function" ? value.bind(page) : value;
    },
  }
);

module.exports = {
  launch,
  closeBrowser,
  newSession,
  currentPage,
  getConsoleErrors,
  page: pageProxy,
  firstLine,
};
