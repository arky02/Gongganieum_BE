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

const getUserInfoFromToken = (req, res) => {
  // Authorization Header Token으로부터 payload 정보 추출
  const payload = getDecodedTokenPayload(req);
  if (!payload) {
    res.status(400).json({
      user_role: "SIGNED_OUT",
    });
    console.log("유저 ROLE 체크 => AccessToken 없음, USER_SIGNED_OUT!");
    console.log('user_role => "SIGNED_OUT"');
    return;
  }
  const { userId, role } = payload;

  return { userId, role };
};

module.exports = { getDecodedTokenPayload, getUserInfoFromToken };
