import dotenv from "dotenv";

dotenv.config();

/** Auth provider issuer and JWKS URLs, built from env values and provider hostnames. */
const httpsUrl = (host: string, path = "") => `https://${host}${path}`;

export const auth0Domain = process.env["VITE_AUTH0_DOMAIN"] ?? "";
export const auth0JwksUri = httpsUrl(auth0Domain, "/.well-known/jwks.json");
export const auth0Issuer = httpsUrl(auth0Domain, "/");

export const oktaIssuer = httpsUrl(process.env["VITE_OKTA_DOMAIN"] ?? "", "/oauth2/default");

export const googleJwksUri = httpsUrl("www.googleapis.com", "/oauth2/v3/certs");
export const googleIssuer = "accounts.google.com";

export const cognitoIssuer = (region: string, userPoolId: string) =>
  httpsUrl(`cognito-idp.${region}.amazonaws.com`, `/${userPoolId}`);
export const cognitoJwksUri = (region: string, userPoolId: string) =>
  `${cognitoIssuer(region, userPoolId)}/.well-known/jwks.json`;
