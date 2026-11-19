import { setupWorker } from "msw/browser";

import { localOrigin } from "../../src/utils/apiConfig";

const mockBackendPort = 3001;

export const apiUrl = (path: string) => `${localOrigin(mockBackendPort)}${path}`;

export const worker = setupWorker();
