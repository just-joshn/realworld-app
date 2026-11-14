# Sign in and session

A user signs in with a username and password and lands on the home feed. The session survives a reload. "Remember me" keeps the session for 30 days. Logout ends the session. Every private page sends anonymous visitors to `/signin`.

## Sub-features

- `signin-valid`: correct credentials open `/` with the user's name and @username in the side nav. This creates a server session.
- `signin-invalid`: a wrong password or unknown user shows "Username or password is invalid". No session is created.
- `signin-validation`: a password under 4 characters shows an inline message, and the Sign In button is disabled.
- `remember-me`: when checked, the `connect.sid` cookie expires in 30 days. Unchecked, it is a browser-session cookie.
- `signout`: the side-nav Logout destroys the session and returns to `/signin`.
- `route-guard`: anonymous visits to `/`, `/personal`, `/user/settings`, `/bankaccounts`, `/notifications` and `/transaction/new` redirect to `/signin`.

## How to get to it (user POV)

- Open `http://localhost:3000/signin` directly.
- Open any private URL while signed out. The app redirects to `/signin`.
- After signing up, the app sends you to `/signin`.
- Choose **Logout** in the left side nav (desktop width) to sign out. On the onboarding dialog, **Logout** (`user-onboarding-logout`) also signs out.

## Driving it with drive.sh

Preconditions:

- Baseline preconditions from the README are met.
- `Heath93` still has password `s3cret`. No journey changes passwords.

- **Valid sign-in.** Run `scripts/drive.sh signin`. The journey fills `signin-username` and `signin-password` and clicks `signin-submit`. The URL becomes `/`. `sidenav-username` contains `Heath93`. `sidenav-user-full-name` matches the stored `firstName`. `/checkAuth` returns 200 for `Heath93`. After a reload the user is still on `/`.
- **Invalid credentials and validation.** Run `scripts/drive.sh signin-invalid`. First it submits a wrong password: `signin-error` reads "Username or password is invalid", the URL stays `/signin`, and `/checkAuth` returns 401. Next it enters a 3-character password: "Password must contain at least 4 characters" is shown and `signin-submit` is disabled. Finally it tries an unknown username, which shows the same generic error.
- **Remember me.** Run `scripts/drive.sh remember-me`. Without the checkbox, the `connect.sid` cookie has `expires -1`. With `signin-remember-me` checked, it expires in about 30 days.
- **Sign out.** Run `scripts/drive.sh signout`. Clicking `sidenav-signout` lands on `/signin` and `/checkAuth` returns 401. Visiting `/user/settings` afterwards bounces back to `/signin`.
- **Route guard.** Run `scripts/drive.sh guard`. All six private routes redirect an anonymous browser to `/signin`.
- **Proof.** Look at `/tmp/verify-rwa/evidence/<RUN_ID>/signin/02-submit-valid-credentials.png`, its `.aria.yml`, and `steps.json`. They show the side nav with `@Heath93` and the 200 `/checkAuth` result.

## Gotchas

- The Sign In button is **enabled** on an empty form. Formik only validates after you touch a field. Don't assert that it starts disabled.
- `/checkAuth` has to be fetched from inside the page so the browser's cookie is sent. A `curl` from the shell is always anonymous.
- The `settings` journey renames `Heath93`'s `firstName`. Check the name against `data/database.json`, never against "Ted".
- The side nav and its Logout item are visible without a click only at desktop width. At narrow widths, open `sidenav-toggle` first.
- The auth state is cached in `localStorage.authState`. A fresh browser context avoids stale state. Reusing a context across users can show the previous user briefly.
