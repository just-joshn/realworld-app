import { createProxyMiddleware } from "http-proxy-middleware";
import "dotenv/config";
import { localOrigin } from "./utils/apiConfig";

const backendPort = process.env.BACKEND_PORT;

export default function setupProxy(app) {
  app.use(
    createProxyMiddleware({
      pathFilter: ["/login", "/callback", "/logout", "/checkAuth", "/graphql"],
      target: localOrigin(backendPort ?? ""),
      changeOrigin: true,
    })
  );
}
