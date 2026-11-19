const { createProxyMiddleware } = require("http-proxy-middleware");
require("dotenv").config();

const backendPort = process.env.BACKEND_PORT;

module.exports = function (app) {
  app.use(
    createProxyMiddleware({
      pathFilter: ["/login", "/callback", "/logout", "/checkAuth", "/graphql"],
      target: `http://localhost:${backendPort ?? ""}`,
      changeOrigin: true,
    })
  );
};
