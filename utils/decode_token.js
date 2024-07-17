const { decodePayload } = require("./jwt.js");

// Decode Token
const getDecodedTokenPayload = (req) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {
    console.log("No Authorization Header Token Provided!");
    return false;
  }
  console.log("Authorization Header Token: ", token);

  const payload = decodePayload(token);
  return payload;
};

const getUserInfoFromToken = (req, res, is로그인_검증_필요) => {
  // Authorization Header Token으로부터 payload 정보 추출

  let payload = null;
  try {
    payload = getDecodedTokenPayload(req);
  } catch (e) {
    console.log("유저 ROLE 체크 => AccessToken 만료됨, USER_SESSION_EXPIRED!");
    console.log("재로그인 필요함");
    res.status(401).json({
      error: "USER_SESSION_EXPIRED",
    });
    return false;
  }

  // payload = { userId, role }
  if (!payload) {
    res.status(is로그인_검증_필요 ? 401 : 200).json({
      error: "USER_SIGNED_OUT",
    });
    console.log("유저 ROLE 체크 => AccessToken 없음, USER_SIGNED_OUT!");
    console.log('user_role => "SIGNED_OUT"');
    return;
  }

  return payload;
};

module.exports = { getDecodedTokenPayload, getUserInfoFromToken };
