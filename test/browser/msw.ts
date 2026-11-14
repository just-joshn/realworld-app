import { setupWorker } from "msw/browser";

export const apiUrl = (path: string) => `http://localhost:3001${path}`;

export const worker = setupWorker();
