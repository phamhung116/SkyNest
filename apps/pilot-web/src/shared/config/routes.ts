export const routes = {
  login: "/login",
  home: "/",
  flightDetail: (code: string) => `/flights/${code}`,
  account: "/account",
  posts: "/posts"
};
