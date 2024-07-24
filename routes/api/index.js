// =================================================================================================
//  기타 API들 - Root Endpoint: /api
// =================================================================================================

var express = require("express");
var router = express.Router();
const maria = require("../../config/maria.js");

const { getUserInfoFromToken } = require("../../utils/decode_token.js");

// =================================================================================================
//  문의하기 페이지 API
// =================================================================================================

// 문의하기 전체 정보 리스트 GET
router.get("/contact/infos", (req, res) => {
  /*
  #swagger.tags = ['Contact']
  #swagger.summary = '전체 문의하기 정보 리스트 리턴
  #swagger.description = "Response Datatype: ContactMsg[]"
*/

  maria.query(`SELECT * FROM ContactMsg`, function (err, result) {
    if (!err) {
      console.log("All ContactMsg's info are sent");
      res.send(result);
    } else {
      console.log("ERR : " + err);
      res.status(404).json({
        error: "Error",
      });
    }
  });
});

router.post("/contact", function (req, res) {
  /*
  #swagger.tags = ['Contact']
  #swagger.summary = '문의하기 Post'
  #swagger.description = 'POST Test Api 입니다.'
*/
  // Authorization Header Token으로부터 유저 정보 추출
  const payload = getUserInfoFromToken(req, res, true);
  if (!payload) return;
  const { userId } = payload;

  let name,
    phone,
    email,
    company,
    date1,
    date2,
    budget,
    reason,
    enterpath,
    requests,
    buildingId;

  try {
    buildingId = req.body.buildingId; // 필수 입력 field
    name = req.body?.name ?? "";
    phone = req.body?.phone ?? "";
    email = req.body?.email ?? "";
    company = req.body?.company ?? "";
    date1 = req.body?.date1 ?? "";
    date2 = req.body?.date2 ?? "";
    budget = req.body?.budget ?? "";
    reason = req.body?.reason ?? "";
    enterpath = req.body?.enterpath ?? "";
    size = req.body?.size ?? "";
    areaList = req.body?.areaList ?? "";
    requests = req.body?.requests ?? "";
  } catch (e) {
    console.log("ERR (get request) : " + e);
    res.status(400).json({
      error: "ERR_PARAMS : buildingId는 필수 입력 필드 값 입니다.",
    });
  }

  const contactPostQuery = `${buildingId}, ${userId}, "${name}", "${phone}", "${email}", "${company}", "${date1}", "${date2}", "${budget}", "${reason}", "${enterpath}", "${size}", "${areaList}", "${requests}"`;
  console.log("문의 내용: ", contactPostQuery);

  maria.query(
    `INSERT INTO ContactMsg(buildingId, userId, name, phone, email, company, date1, date2, budget, reason, enterpath, size, areaList, requests) VALUES (${contactPostQuery});`,
    function (err) {
      if (!err) {
        console.log("(문의하기) 문의가 작성되었습니다!");
        res.status(201).json({
          message: "문의가 작성되었습니다!",
        });
      } else {
        console.log("ERR (문의하기) : " + err);
        res.status(409).json({
          error: "body 형식이 틀리거나 데이터베이스에 문제가 발생했습니다.",
        });
      }
    }
  );
});

// =================================================================================================
//  추천 캐러셀 (메인페이지, 지도페이지) API
// =================================================================================================

// 캐러셀 전체 정보 리스트 GET
router.get("/carousel/infos", (req, res) => {
  /*
  #swagger.tags = ['Carousel']
  #swagger.summary = '전체 캐러셀 정보 리스트 리턴
  #swagger.description = "Response Datatype: CarouselContents[]"
*/

  maria.query(`SELECT * FROM CarouselContents`, function (err, result) {
    if (!err) {
      console.log("All Carousel's info are sent");
      res.send(result);
    } else {
      console.log("ERR : " + err);
      res.status(404).json({
        error: "Error",
      });
    }
  });
});

// /carousel/building/main_page?type=main_banner|primary|secondary|recommend_banner
// /carousel/building/map
router.get("/carousel/building/:pageType", (req, res) => {
  /*
  #swagger.tags = ['Carousel']
  #swagger.summary = '메인 페이지의 추천 건물 캐러셀 리스트 리턴'
  #swagger.description = ''
*/
  const pageType = req.params.pageType;
  const carouselTypeQuery = req.query?.type
    ? 'carouselType="' + req.query?.type + '"'
    : "carouselType IS NULL";

  maria.query(
    `SELECT * FROM CarouselContents WHERE pageType="${pageType}" and ${carouselTypeQuery} and contentType="Buildings";`,
    function (err, result) {
      if (!err) {
        console.log(
          "(캐러셀 빌딩 데이터) 메인 페이지의 추천 건물 캐러셀 리스트 Sent"
        );
        res.status(200).json(result);
      } else {
        console.log("ERR (캐러셀 빌딩 데이터) : " + err);
        res.status(400).json({
          error: err.message ?? err,
        });
      }
    }
  );
});

// =================================================================================================
// TEST API : 테스트 용 API (GET, POST) - 2개
// =================================================================================================

router.get("/get/test", (req, res) => {
  /*
  #swagger.tags = ['Test']
  #swagger.summary = 'GET Test Api'
  #swagger.description = 'GET Test Api 입니다.'
*/

  res.status(200).send({ test: "hi" });
});

router.post("/save/user/test", function (req, res) {
  /*
  #swagger.tags = ['Test']
  #swagger.summary = 'POST Test Api'
  #swagger.description = 'POST Test Api 입니다.'
*/

  var name = "";
  var age = 0;
  try {
    name = req.body.name;
    age = req.body.age;
  } catch (e) {
    console.log("ERR (get request) : " + e);
    res.status(400).json({
      error: "ERR_PARAMS : email or name is not valid",
    });
  }

  maria.query(
    `INSERT INTO Test(name,age) VALUES ("${name}", ${age})`,
    function (err) {
      if (!err) {
        console.log("(Save User) User is saved : " + name);
        res.status(200).json({
          message: "User is saved",
        });
      } else {
        console.log("ERR (Save User) : " + err);
        res.status(409).json({
          error: "body 형식이 틀리거나 데이터베이스에 문제가 발생했습니다.",
        });
      }
    }
  );
});

module.exports = router;
