const { decodePayload } = require("./jwt.js");

function getDecodedTokenPayload(req) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  console.log("Authorization Header Token: ", token);

  const payload = decodePayload(token);
  return payload;
}

module.exports = { getDecodedTokenPayload };
