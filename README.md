<p align="center">
  <!-- We use two SVGs here so that this displays correctly
    on Github. This might not look right in other Markdown previewers. -->
  <img alt="Cypress Real World App Logo" src="./src/svgs/rwa-logo-light.svg#gh-dark-mode-only" />
  <img alt="Cypress Real World App Logo" src="./src/svgs/rwa-logo.svg#gh-light-mode-only" />
</p>

<p align="center">
  <a href="https://cypress.io">
    <img width="140" alt="Cypress Logo" src="./src/svgs/built-by-cypress.svg" />
    </a>
</p>

<p align="center">
   <a href="#contributors-">
    <img src="https://img.shields.io/badge/all_contributors-6-green.svg?style=flat" />
  </a>
</p>

<p align="center">
A payment application with <strong>real-world</strong> features, patterns, and workflows.
</p>

<p align="center">
  <img style='width: 70%' alt="Cypress Real World App" src="./public/img/rwa-readme-screenshot.png" />
</p>

> 💬 **Note from maintainers**
>
> This application is purely for demonstration and educational purposes. Its setup and configuration resemble typical real-world applications, but it's not a full-fledged production system. Use this app to learn, experiment, and tinker.

---

## Features

🛠 Built with [React][reactjs], [XState][xstate], [Express][express], [lowdb][lowdb], [Material-UI][material-ui] and [TypeScript][typescript]
⚡️ Zero database dependencies
🚀 Full-stack [Express][express]/[React][reactjs] application with real-world features and tests
👮‍♂️ Local Authentication
🔥 Database Seeding

## Getting Started

The Cypress Real-World App (RWA) is a full-stack Express/React application backed by a local JSON database ([lowdb]).

The app is bundled with [example data](./data/database.json) (`data/database.json`) that contains everything you need to start using the app out-of-the-box.

> 🚩 **Note**
>
> You can login to the app with any of the [example app users](./data/database.json#L2). The default password for all users is `s3cret`.
> Example users can be seen by running `bun run list:dev:users`.

### Prerequisites

This project requires [Node.js](https://nodejs.org/en/) to be installed on your machine. Refer to the [.node-version](./.node-version) file for the exact version.

[Bun](https://bun.com/) is also required as the package manager. See [Bun's installation guide](https://bun.com/docs/installation) for every platform. On macOS and Linux:

```shell
curl -fsSL https://bun.com/install | bash
```

### Installation

To clone the repo to your local system and install dependencies, execute the following commands:

```shell
git clone https://github.com/cypress-io/cypress-realworld-app
cd cypress-realworld-app
bun install
```

#### Mac users with M-series chips will need to prepend `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true`.

```shell
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true bun install
```

### Run the app

```shell
bun run dev
```

> 🚩 **Note**
>
> The app will run on port `3000` (frontend) and `3001` (API backend) by default. Please make sure there are no other applications or services running on both ports.
> If you want to change the default ports, you can do so by modifying `PORT` and `VITE_BACKEND_PORT` variables in `.env` file.
> However, make sure the modified port numbers in `.env` are not committed into Git since the CI environments still expect the application to run on the default ports.

## Tests

Unit tests live in [`src/__tests__`](./src/__tests__) and run with `bun run test:unit`.

## Database

- The local JSON database is located in [data/database.json](./data/database.json) and is managed with [lowdb].

- The database is [reseeded](./data/database-seed.json) each time the application is started (via `bun run dev`).

- Updates via the React frontend are sent to the [Express][express] server and handled by a set of [database utilities](backend/database.ts)

- Generate a new database using `bun run db:seed`.

- An [empty database seed](./data/empty-seed.json) is provided along with a script (`bun run start:empty`) to view the application without data.

## Additional NPM Scripts

| Script         | Description                                                                                   |
| -------------- | --------------------------------------------------------------------------------------------- |
| dev            | Starts backend in watch mode and frontend                                                     |
| dev:auth0      | Starts backend in watch mode and frontend; [Uses Auth0 for Authentication](#auth0)            |
| dev:okta       | Starts backend in watch mode and frontend; [Uses Okta for Authentication](#okta)              |
| dev:cognito    | Starts backend in watch mode and frontend; [Uses Cognito for Authentication](#amazon-cognito) |
| dev:google     | Starts backend in watch mode and frontend; [Uses Google for Authentication](#google)          |
| start          | Starts backend and frontend                                                                   |
| types          | Validates types                                                                               |
| db:seed        | Generates fresh database seeds for json files in /data                                        |
| start:empty    | Starts backend and frontend with empty database seed                                          |
| tsnode         | Customized ts-node command to get around react-scripts restrictions                           |
| list:dev:users | Provides id and username for users in the dev database                                        |

For a complete list of scripts see [package.json](./package.json)

## 3rd Party Authentication Providers

Support for 3rd party authentication is available in the application to demonstrate the concepts on logging in with a 3rd party provider.

The app contains different entry points for each provider. There is a separate **index** file for each provider, and to use one, you must replace the current **index.tsx** file with the desired one. The following providers are supported:

- [Auth0](#auth0) (index.auth0.tsx)
- [Okta](#okta) (index.okta.tsx)
- [Amazon Cognito](#amazon-cognito) (index.cognito.tsx)
- [Google](#google) (index.google.tsx)

### Auth0

Prerequisites include an [Auth0](https://auth0.com/) account and a Tenant configured for use with a SPA. Environment variables from Auth0 are to be placed in the [.env](./.env).

To start the application with Auth0, replace the current **src/index.tsx** file with the **src/index.auth0.tsx** file and start the application with `bun run dev:auth0`.

### Okta

Prerequisites include an [Okta][okta] account and [application configured for use with a SPA][oktacreateapp]. Environment variables from [Okta][okta] are to be placed in the [.env](./.env).

To start the application with Okta, replace the current **src/index.tsx** file with the **src/index.okta.tsx** file and start the application with `bun run dev:okta`.

### Amazon Cognito

Prerequisites include an [Amazon Cognito][cognito] account. Environment variables from [Amazon Cognito][cognito] are provided by the [AWS Amplify CLI][awsamplify].

- A user pool is required (identity pool is not used here)
  - The user pool must have a hosted UI domain configured, which must:
    - allow callback and sign-out URLs of `http://localhost:3000/`,
    - allow implicit grant Oauth grant type,
    - allow these OpenID Connect scopes:
      - aws.cognito.signin.user.admin
      - email
      - openid
  - The user pool must have an app client configured, with:
    - enabled auth flow `ALLOW_USER_SRP_AUTH`.
  - The user pool must have a user corresponding to the `AWS_COGNITO` env vars mentioned below, and the user's Confirmation Status must be `Confirmed`. If it is `Force Reset Password`, then use a browser to log in once at `http://localhost:3000` while `bun run dev:cognito` is running to reset their password.

The configuration is in a few places:

- The `.env` file has `VITE_AUTH_TOKEN_NAME` and vars beginning `AWS_COGNITO`. Be careful not to commit any secrets.
- Both `scripts/mock-aws-exports.js` and `scripts/mock-aws-exports-es5.js` must have the same data; only their export statements differ. These files can be edited manually or exported from the amplify CLI.

To start the application with Cognito, replace the current **src/index.tsx** file with the **src/index.cognito.tsx** file and start the application with `bun run dev:cognito`. `bun run dev` may need to have been run once first.

### Google

Prerequisites include an [Google][google] account. Environment variables from [Google][google] are to be placed in the [.env](./.env).

To start the application with Google, replace the current **src/index.tsx** file with the **src/index.google.tsx** file and start the application with `bun run dev:google`.

## License

[![license](https://img.shields.io/badge/license-MIT-green.svg)](https://github.com/cypress-io/cypress/blob/master/LICENSE)

This project is licensed under the terms of the [MIT license](/LICENSE).

[reactjs]: https://reactjs.org
[xstate]: https://xstate.js.org
[express]: https://expressjs.com
[lowdb]: https://github.com/typicode/lowdb
[typescript]: https://typescriptlang.org
[material-ui]: https://material-ui.com
[okta]: https://okta.com
[auth0]: https://auth0.com
[oktacreateapp]: https://developer.okta.com/docs/guides/sign-into-spa/react/create-okta-application/
[cognito]: https://aws.amazon.com/cognito
[awsamplify]: https://amplify.aws
[google]: https://google.com

## Contributors ✨

Thanks goes to these wonderful people ([emoji key](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tr>
    <td align="center"><a href="http://www.kevinold.com"><img src="https://avatars0.githubusercontent.com/u/21967?v=4" width="100px;" alt=""/><br /><sub><b>Kevin Old</b></sub></a></td>
    <td align="center"><a href="https://twitter.com/amirrustam"><img src="https://avatars0.githubusercontent.com/u/334337?v=4" width="100px;" alt=""/><br /><sub><b>Amir Rustamzadeh</b></sub></a></td>
    <td align="center"><a href="https://twitter.com/be_mann"><img src="https://avatars2.githubusercontent.com/u/1268976?v=4" width="100px;" alt=""/><br /><sub><b>Brian Mann</b></sub></a></td>
    <td align="center"><a href="https://glebbahmutov.com/"><img src="https://avatars1.githubusercontent.com/u/2212006?v=4" width="100px;" alt=""/><br /><sub><b>Gleb Bahmutov</b></sub></a></td>
    <td align="center"><a href="http://www.bencodezen.io"><img src="https://avatars0.githubusercontent.com/u/4836334?v=4" width="100px;" alt=""/><br /><sub><b>Ben Hong</b></sub></a></td>
    <td align="center"><a href="https://github.com/davidkpiano"><img src="https://avatars2.githubusercontent.com/u/1093738?v=4" width="100px;" alt=""/><br /><sub><b>David Khourshid</b></sub></a></td>
  </tr>
</table>

<!-- markdownlint-enable -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!!
