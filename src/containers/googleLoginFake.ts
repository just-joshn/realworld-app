import type { GoogleLoginResponse } from "@matheusluizn/react-google-login";

const googleTokenId = "google-token";
const googleUser = {
  id: "user1",
  email: "ada@example.com",
  name: "Ada Lovelace",
  givenName: "Ada",
  familyName: "Lovelace",
  imageUrl: "",
};

const tokenObj = {
  access_token: googleTokenId,
  id_token: googleTokenId,
  login_hint: "",
  scope: "",
  expires_in: 3600,
  first_issued_at: 0,
  expires_at: 3600000,
};

function basicProfile() {
  return {
    getId: () => googleUser.id,
    getEmail: () => googleUser.email,
    getName: () => googleUser.name,
    getGivenName: () => googleUser.givenName,
    getFamilyName: () => googleUser.familyName,
    getImageUrl: () => googleUser.imageUrl,
  };
}

// A signed-in Google response for the fake SDK. Every field is constant, so one value serves all tests.
export const googleLoginResponse: GoogleLoginResponse = {
  tokenId: googleTokenId,
  profileObj: {
    googleId: googleUser.id,
    email: googleUser.email,
    name: googleUser.name,
    givenName: googleUser.givenName,
    familyName: googleUser.familyName,
    imageUrl: googleUser.imageUrl,
  },
  googleId: googleUser.id,
  accessToken: googleTokenId,
  tokenObj,
  getBasicProfile: basicProfile,
  getAuthResponse: () => tokenObj,
  reloadAuthResponse: () => Promise.resolve(tokenObj),
  getGrantedScopes: () => "",
  getHostedDomain: () => "",
  getId: () => googleUser.id,
  isSignedIn: () => true,
  hasGrantedScopes: () => true,
  disconnect: () => {},
  grantOfflineAccess: () => Promise.resolve({ code: "code" }),
  signIn: () => Promise.resolve(),
  grant: () => Promise.resolve(),
};
