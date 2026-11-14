import express from "express";
import type { RequestHandler } from "express";
import { required } from "./required";
import { join } from "path";
import logger from "morgan";
import passport from "passport";
import session from "express-session";
import bodyParser from "body-parser";
import cors from "cors";
import paginate from "express-paginate";
import { createHandler as graphqlHandler } from "graphql-http/lib/use/express";
import { loadSchemaSync } from "@graphql-tools/load";
import { GraphQLFileLoader } from "@graphql-tools/graphql-file-loader";
import { addResolversToSchema } from "@graphql-tools/schema/index.js";

import auth from "./auth";
import userRoutes from "./user-routes";
import contactRoutes from "./contact-routes";
import bankAccountRoutes from "./bankaccount-routes";
import gqlPlaygroundRoutes from "./gql-playground-routes";
import transactionRoutes from "./transaction-routes";
import likeRoutes from "./like-routes";
import commentRoutes from "./comment-routes";
import notificationRoutes from "./notification-routes";
import bankTransferRoutes from "./banktransfer-routes";
import testDataRoutes from "./testdata-routes";
import { checkAuth0Jwt, verifyOktaToken, checkCognitoJwt, checkGoogleJwt } from "./helpers";
import resolvers from "./graphql/resolvers";
import { frontendPort, getBackendPort } from "../src/utils/portUtils";

import dotenv from "dotenv";

dotenv.config();

const corsOption = {
  origin: `http://localhost:${frontendPort ?? "3000"}`,
  credentials: true,
};

const schema = loadSchemaSync(join(__dirname, "./graphql/schema.graphql"), {
  loaders: [new GraphQLFileLoader()],
});

const schemaWithResolvers = addResolversToSchema({
  schema,
  resolvers,
});

const app = express();

app.use(cors(corsOption));
app.use(logger("dev"));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const sessionMiddleware = session({
  secret: "session secret",
  resave: false,
  saveUninitialized: false,
  unset: "destroy",
});
app.use((req, res, next) => {
  void sessionMiddleware(req, res, next);
});
const typedPassport: passport.Authenticator<RequestHandler, RequestHandler> = passport;
app.use(typedPassport.initialize());
const passportSession = typedPassport.session();
app.use(passportSession);

app.use(
  paginate.middleware(+required(process.env["PAGINATION_PAGE_SIZE"], "PAGINATION_PAGE_SIZE"))
);

if (process.env["NODE_ENV"] === "test" || process.env["NODE_ENV"] === "development") {
  app.use("/testData", testDataRoutes);
}

app.use(auth);

if (process.env["VITE_AUTH0"]) {
  app.use(checkAuth0Jwt);
}

if (process.env["VITE_OKTA"]) {
  app.use(verifyOktaToken);
}

if (process.env["VITE_AWS_COGNITO"]) {
  app.use(checkCognitoJwt);
}

if (process.env["VITE_GOOGLE"]) {
  app.use(checkGoogleJwt);
}

app.get("/", (_req, res) => {
  res.send("Cypress Realworld App - backend");
});
app.use("/graphql", gqlPlaygroundRoutes);
app.use(
  "/graphql",
  graphqlHandler({
    schema: schemaWithResolvers,
    context: (req) => {
      return { user: req.raw.user };
    },
  })
);
app.use("/users", userRoutes);
app.use("/contacts", contactRoutes);
app.use("/bankAccounts", bankAccountRoutes);
app.use("/transactions", transactionRoutes);
app.use("/likes", likeRoutes);
app.use("/comments", commentRoutes);
app.use("/notifications", notificationRoutes);
app.use("/bankTransfers", bankTransferRoutes);

app.use(express.static(join(__dirname, "../public")));

void getBackendPort().then((port) => {
  app.listen(port);
});
