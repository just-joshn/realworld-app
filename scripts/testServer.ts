import path from "path";
import express from "express";
import history from "connect-history-api-fallback";
import setupProxy from "../src/setupProxy";
import { frontendPort } from "../src/utils/apiConfig";

const app = express();

setupProxy(app);

const historyMiddleware = history();
app.use((req, res, next) => {
  void historyMiddleware(req, res, next);
});
app.use(express.static(path.join(__dirname, "../build")));

app.listen(frontendPort);
