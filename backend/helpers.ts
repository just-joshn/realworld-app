import dotenv from "dotenv";
import { set } from "lodash";
import type { Request, Response, NextFunction } from "express";
import type { ValidationChain } from "express-validator";
import { required } from "./required";
import { validationResult } from "express-validator";
import { expressjwt, type Params } from "express-jwt";
import jwksRsa from "jwks-rsa";

import OktaJwtVerifier from "@okta/jwt-verifier";
import awsConfig from "../src/aws-exports";
import {
  auth0Issuer,
  auth0JwksUri,
  cognitoIssuer,
  cognitoJwksUri,
  googleIssuer,
  googleJwksUri,
  oktaIssuer,
} from "./config/auth-providers";

dotenv.config();

const auth0JwtConfig: Params = {
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: auth0JwksUri,
  }),

  audience: process.env["VITE_AUTH0_AUDIENCE"],
  issuer: auth0Issuer,
  algorithms: ["RS256"],
};

const oktaJwtVerifier = new OktaJwtVerifier({
  issuer: oktaIssuer,
  clientId: process.env["VITE_OKTA_CLIENTID"] ?? "",
  assertClaims: {
    aud: "api://default",
    cid: process.env["VITE_OKTA_CLIENTID"] ?? "",
  },
});
const googleJwtConfig: Params = {
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: googleJwksUri,
  }),

  audience: process.env["VITE_GOOGLE_CLIENTID"],
  issuer: googleIssuer,
  algorithms: ["RS256"],
};

export const verifyOktaToken = (req: Request, res: Response, next: NextFunction) => {
  const bearerHeader = req.headers["authorization"];

  if (bearerHeader) {
    const bearer = bearerHeader.split(" ");
    const bearerToken = required(bearer[1], "bearer token");

    oktaJwtVerifier
      .verifyAccessToken(bearerToken, "api://default")
      .then((jwt) => {
        set(req, "user", { sub: "sub" in jwt ? jwt.sub : undefined });
        next();
      })
      .catch((err: unknown) => {
        console.error("Okta access token verification failed:", err);
        res.status(401).send({ error: "Unauthorized" });
      });
  } else {
    res.status(401).send({
      error: "Unauthorized",
    });
  }
};

// https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-tokens-verifying-a-jwt.html#amazon-cognito-user-pools-using-tokens-step-2
const userPoolId = awsConfig.Auth.Cognito.userPoolId;
const region = required(userPoolId.split("_")[0], "Cognito region");
const awsCognitoJwtConfig: Params = {
  secret: jwksRsa.expressJwtSecret({
    jwksUri: cognitoJwksUri(region, userPoolId),
  }),

  issuer: cognitoIssuer(region, userPoolId),
  algorithms: ["RS256"],
};

const skipTestData = (config: Params) => {
  const verify = expressjwt({ ...config, requestProperty: "user" });
  return (req: Request, res: Response, next: NextFunction) => {
    if (/^\/testData\//.test(req.originalUrl)) {
      next();
      return;
    }
    void verify(req, res, next);
  };
};
export const checkAuth0Jwt = skipTestData(auth0JwtConfig);
export const checkCognitoJwt = skipTestData(awsCognitoJwtConfig);
export const checkGoogleJwt = skipTestData(googleJwtConfig);

export const ensureAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) {
    if (req.user.sub) {
      set(req.user, "id", req.user.sub);
    }
    next();
    return;
  }
  res.status(401).send({
    error: "Unauthorized",
  });
};

export const validateMiddleware = (validations: ValidationChain[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    void Promise.all(validations.map((validation) => validation.run(req)))
      .then(() => {
        const errors = validationResult(req);
        if (errors.isEmpty()) {
          next();
          return;
        }

        res.status(422).json({ errors: errors.array() });
      })
      .catch(next);
  };
};
