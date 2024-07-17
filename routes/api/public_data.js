// =================================================================================================
//  공공데이터 API - Root Endpoint: /api/data
// =================================================================================================

var express = require("express");
var router = express.Router();
const axios = require("axios");

router.get("/address_code", async (req, res) => {
  /*
  #swagger.tags = ['공공데이터']
  #swagger.summary = '공공데이터 - 주소 코드'
  #swagger.description = ""
*/

  const address = req.query.address;

  const response = await axios.get(
    `https://api.vworld.kr/req/search?service=search&request=search&version=2.0&crs=EPSG:900913&size=10&page=1&query=${address}&type=address&category=road&format=json&errorformat=json&key=ACD06AF5-4717-3696-8A0F-13A93EEC7187`
  );
  console.log("공공데이터 API - address code:  ", response?.data ?? "");

  res.send(response?.data ?? "");
});

router.get("/building_info", async (req, res) => {
  /*
  #swagger.tags = ['공공데이터']
  #swagger.summary = '공공데이터 - 건축물대장'
  #swagger.description = ""
*/

  const sigunguCd = req.query.sigunguCd;
  const bjdongCd = req.query.bjdongCd;
  const bun = req.query.bun;
  const ji = req.query.ji;

  const response = await axios.get(
    `https://apis.data.go.kr/1613000/BldRgstService_v2/getBrTitleInfo?sigunguCd=${sigunguCd}&bjdongCd=${bjdongCd}&bun=${bun}&ji=${ji}&ServiceKey=${process.env.PUB_DATA_SERVICE_KEY}`
  );
  console.log("공공데이터 API - building info: ", response?.data ?? "");

  res.send(response?.data ?? "");
});

router.get("/area_info", async (req, res) => {
  /*
  #swagger.tags = ['공공데이터']
  #swagger.summary = '공공데이터 - 지역데이터'
  #swagger.description = ""
*/

  const area = req.query.area;

  const response = await axios.get(
    `http://openapi.seoul.go.kr:8088/4c5458685467776c37364e7a734d58/xml/citydata_ppltn/1/5/${area}`
  );
  console.log("공공데이터 API - area info: ", response?.data ?? "");
  console.log("공공데이터 API - area info: ", response ?? "");

  res.send(response?.data ?? "");
});

module.exports = router;
