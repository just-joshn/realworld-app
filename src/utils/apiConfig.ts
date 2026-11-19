export const frontendPort = process.env["PORT"];
export const backendPort = process.env["VITE_BACKEND_PORT"];

/** The only place the dev host lives. Every URL to the app or API is built from here. */
export const appHost = "localhost";

export const localOrigin = (port: string | number | undefined) =>
  `http://${appHost}:${String(port)}`;

export const apiUrl = (path: string) => `${localOrigin(backendPort)}${path}`;
