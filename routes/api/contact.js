var express = require("express");
var router = express.Router();
const maria = require("../../config/maria.js");
const { getUserInfoFromToken } = require("../../utils/decode_token.js");

// =================================================================================================
//  문의하기 페이지 API
// =================================================================================================

// 문의하기 전체 정보 리스트 GET
router.get("/infos", (req, res) => {
  /*
  #swagger.tags = ['Contact']
  #swagger.summary = '전체 문의하기 정보 리스트 리턴
  #swagger.description = "Response Datatype: ContactMsg[]"
*/

  maria.query(`SELECT * FROM ContactMsg`, function (err, result) {
    if (!err) {
      console.log("(문의하기 정보 리턴) All ContactMsg's info are sent");
      res.send(result);
    } else {
      console.log("ERR (문의하기 정보 리턴) : " + err);
      res.status(404).json({
        error: "Error",
      });
    }
  });
});

// 특정 유저의 문의하기 리스트 GET
router.get("/info", (req, res) => {
  /*
  #swagger.tags = ['Contact']
  #swagger.summary = '특정 유저의 문의하기 리스트 리텅
  #swagger.description = "Response Datatype: ContactMsg[]"
*/
  // Authorization Header Token으로부터 유저 정보 추출
  const payload = getUserInfoFromToken(req, res, true);
  if (!payload) return;
  const { userId } = payload;

  maria.query(
    `SELECT * FROM ContactMsg WHERE userId=${userId}`,
    function (err, result) {
      if (!err) {
        console.log(
          `(문의하기 정보 리턴) UserID: ${userId}'s All ContactMsg info are sent`
        );
        res.send(result);
      } else {
        console.log("ERR (문의하기 정보 리턴) : " + err);
        res.status(404).json({
          error: "Error",
        });
      }
    }
  );
});

// 문의하기 작성
router.post("/", function (req, res) {
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
    `INSERT INTO ContactMsg(buildingId, userId, name, phone, email, company, date1, date2, budget, reason, enterpath, size, areaList, requests, addedDate) VALUES (${contactPostQuery} , NOW());`,
    function (err) {
      if (!err) {
        console.log("(문의하기 작성) 문의가 작성되었습니다!");
        res.status(201).json({
          message: "문의가 작성되었습니다!",
        });
      } else {
        console.log("ERR (문의하기 작성) : " + err);
        res.status(409).json({
          error: "body 형식이 틀리거나 데이터베이스에 문제가 발생했습니다.",
        });
      }
    }
  );
});

// 문의하기 정보 삭제
router.get("/remove", (req, res) => {
  /*
  #swagger.tags = ['Contact']
  #swagger.summary = '문의하기 정보 삭제'
  #swagger.description = ""
*/
  let id;
  try {
    id = req.query.id; // -> where
  } catch (e) {
    console.log("ERR (get request) : " + e);
    res.status(400).json({
      error:
        "ERR_PARAMS : id(삭제할 문의하기 id)를 쿼리에 필수로 입력해야 합니다.",
    });
  }

  maria.query(
    `DELETE FROM ContactMsg WHERE _id=${id};`,
    function (err, result) {
      if (!err) {
        console.log(`(문의하기 삭제) id: ${id}의 문의하기 정보 삭제 완료`);
        res.send({ message: "문의하기 삭제 성공" });
      } else {
        console.log("ERR (문의하기 삭제) : " + err);
        res.status(404).json({
          error: "Error",
        });
      }
    }
  );
});

module.exports = router;
