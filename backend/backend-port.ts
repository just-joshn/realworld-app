import chalk from "chalk";
import detect from "detect-port";
import { backendPort, localOrigin } from "../src/utils/apiConfig";

const writeLine = (message: string) => process.stdout.write(`${message}\n`);

/** Node-only: the browser bundle must not import this, so it lives outside src/utils. */
export const getBackendPort = async () => {
  return detect(Number(backendPort))
    .then((_port) => {
      if (Number(backendPort) === _port) {
        writeLine(chalk.green(`Backend server running at ${localOrigin(backendPort)}`));
        return Number(backendPort);
      }

      console.error(
        chalk.red(
          `Failed to start the backend server on port ${String(backendPort)}. \n Starting the backend server on port ${String(_port)}. \n Please update VITE_BACKEND_PORT in the .env file to ${String(_port)}.`
        )
      );
      return _port;
    })
    .catch((err: unknown) => {
      console.error(chalk.red(String(err)));
    });
};
