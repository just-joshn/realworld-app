import type { ResourcesConfig } from "aws-amplify";

declare const awsConfig: ResourcesConfig & {
  Auth: { Cognito: { userPoolId: string; userPoolClientId: string } };
};
export default awsConfig;
