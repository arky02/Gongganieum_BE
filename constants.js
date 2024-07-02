const OAUTH_GET_TOKEN_URL = {
  naver: "https://kauth.kakao.com/oauth/token",
  kakao: "https://nid.naver.com/oauth2.0/token",
};

const OAUTH_GET_USERINFO_URL = {
  naver: "https://openapi.naver.com/v1/nid/me",
  kakao: "https://kapi.kakao.com/v2/user/me",
};

const OAUTH_CLIENT_SECRET = {
  naver: process.env.OAUTH_NAVER_CLIENT_SECRET,
  kakao: process.env.OAUTH_KAKAO_CLIENT_SECRET,
};

const OAUTH_CLIENT_ID = {
  naver: process.env.OAUTH_NAVER_CLIENT_ID,
  kakao: process.env.OAUTH_KAKAO_CLIENT_ID,
};

module.exports = {
  OAUTH_GET_TOKEN_URL,
  OAUTH_GET_USERINFO_URL,
  OAUTH_CLIENT_SECRET,
  OAUTH_CLIENT_ID,
};
