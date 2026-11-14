import axios from "axios";

export const getAuthTokenName = () => {
  const tokenName = process.env.VITE_AUTH_TOKEN_NAME;
  if (!tokenName) throw new Error("VITE_AUTH_TOKEN_NAME is required");
  return tokenName;
};

const httpClient = axios.create({
  withCredentials: true,
});

httpClient.interceptors.request.use((config) => {
  if (
    process.env.VITE_AUTH0 ||
    process.env.VITE_OKTA ||
    process.env.VITE_AWS_COGNITO ||
    process.env.VITE_GOOGLE
  ) {
    const accessToken = localStorage.getItem(getAuthTokenName());
    config.headers ??= {};
    config.headers["Authorization"] = `Bearer ${accessToken}`;
  }
  return config;
});

export { httpClient };
