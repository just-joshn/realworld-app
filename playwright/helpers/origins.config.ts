import { localOrigin } from "../../src/utils/apiConfig";

export const defaultWebPort = 3300;
export const defaultApiPort = 3301;

export const defaultWebUrl = localOrigin(defaultWebPort);
export const defaultApiUrl = localOrigin(defaultApiPort);
