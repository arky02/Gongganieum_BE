const { makeToken } = require("./jwt.js");

// Response로 JWT AccessToken(_id, role), Role 정보 보내기
const sendOAuthDataWithToken = ({ userId, name, role, res }) => {
  const payload = { userId, role };
  console.log("payload", payload);
  const accessToken = makeToken(payload);
  console.log("accessToken", accessToken);
  // const cookiOpt = { maxAge: 1000 * 60 * 60 * 24 };
  // res.cookie("accessToken", accessToken, cookiOpt);

  console.log(`=== 소셜로그인 RES 전송, ROLE: ${role} 처리 완료 ===`);

  res.status(200).json({ accessToken, name, role });
};

module.exports = sendOAuthDataWithToken;
