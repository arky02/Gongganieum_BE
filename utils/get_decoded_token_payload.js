const { decodePayload } = require("./jwt.js");

function getDecodedTokenPayload(req) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {
    console.log("No Authorization Header Token Provided!");
    return false;
  }
  console.log("Authorization Header Token: ", token);

  const payload = decodePayload(token);
  return payload;
}

module.exports = { getDecodedTokenPayload };
