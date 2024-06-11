// var openAI = require("openai");
// const openai = new openAI.OpenAI();
var express = require("express");
var router = express.Router();
// var cors = require('cors');
const maria = require("../config/maria");

// Res: Popups(_id: int, name: str, type: str, date: str, address: str, keyword: str, building: str)
router.get("/popup/infos", (req, res) => {
  /*
  #swagger.tags = ['GET Requests']
  #swagger.summary = 'GET Request Api'
  #swagger.description = "전체 팝업 리스트의 정보(카테고리, 팝업명, 진행 기간, 진행 장소, 관련 키워드)를 가져오는 GET request 입니다."
*/

  maria.query(`SELECT * FROM Popups`, function (err, result) {
    if (!err) {
      console.log("All Popup's info are sent");
      res.send(result);
    } else {
      console.log("ERR : " + err);
      res.status(404).json({
        error: "Error",
      });
    }
  });
});

// /building/infos?id={건물id}

// Res: Buildings(_id: int, name: str, address: str, coord: str, popups: PopupList[], img: str, isours: bool, tag: str, cate: str)
router.get("/building/infos", (req, res) => {
  /*
  #swagger.tags = ['GET Requests']
  #swagger.summary = 'GET Request Api'
  #swagger.description = "전체 건물 리스트의 정보(건물 이름, 주소, 좌표, 현재 팝업 진행 여부, 진행된 팝업 정보 리스트)를 가져오는 GET request 입니다."
*/

  const id = req.query?.id ?? null;

  maria.query(
    `SELECT * FROM Buildings ${id ? `where _id=${id}` : ""}`,
    function (err, result) {
      if (!err) {
        id
          ? console.log(`ID: ${id} Building's info are sent`)
          : console.log("All Building's info are sent");
        res.send(result);
      } else {
        console.log("ERR : " + err);
        res.status(404).json({
          error: "Error",
        });
      }
    }
  );
});

// Res: Buildings(_id: int, name: str, address: str, coord: str, popups: PopupList[], img: str, isours: bool, tag: str, cate: str)
router.get("/building/search", (req, res) => {
  /*
  #swagger.tags = ['GET Requests']
  #swagger.summary = 'GET Request Api'
  #swagger.description = "전체 건물 리스트의 정보(건물 이름, 주소, 좌표, 현재 팝업 진행 여부, 진행된 팝업 정보 리스트)를 가져오는 GET request 입니다."
*/

  let q = req.query?.q ? req.query.q.replaceAll('"', "") : null; // -> where
  const as = req.query?.as ?? "address"; // address(default), building, (popup) -> where
  const cate = req.query?.cate ?? null; // str -> where
  const isours = req.query?.isours ?? null; // true, false -> where
  const order = req.query?.order ? req.query.order.replaceAll('"', "") : "new"; // new(default), popular, (likes)

  let query = "";
  let whereQuery = [];

  // Where 절 생성
  whereQuery.push(
    `b.${as === "building" ? "name" : "address"} LIKE '${"%" + q + "%"}'` // 1. as 필터로 q 검색 => b.address LIKE '%강남%'
  );

  if (cate) whereQuery.push(`b.cate = ${cate}`); // 2. cate 필터 적용 =>
  // 3. isours 필터 적용
  if (isours !== null) whereQuery.push(`b.isours = ${isours}`);

  console.log("빌딩 검색 조건: ", whereQuery);
  console.log("정렬 조건: ", order);

  // order 적용해서 전체 SQl Query문 생성
  switch (order) {
    case "new":
      console.log("new");
      query = `
        SELECT 
            b.*, 
            MIN(STR_TO_DATE(SUBSTRING_INDEX(JSON_UNQUOTE(JSON_EXTRACT(popup.value, '$.date')), ' - ', 1), '%y.%m.%d')) AS earliest_start_date
        FROM 
            Buildings b,
            JSON_TABLE(
                b.popups, 
                '$[*]' 
                COLUMNS (
                    value JSON PATH '$'
                )
            ) AS popup
        ${whereQuery.length > 0 ? `WHERE ${whereQuery.join(" AND ")}` : ""}
        GROUP BY 
            b._id
        ORDER BY 
            earliest_start_date DESC;`;
      break;
    case "popular":
      console.log("popular");
      query = `
      SELECT 
          b.*, 
          JSON_LENGTH(b.popups) AS popups_count
      FROM 
          Buildings b
      ${whereQuery.length > 0 ? `WHERE ${whereQuery.join(" AND ")}` : ""}
      ORDER BY 
          popups_count DESC;`;
      break;
  }

  maria.query(query, function (err, result) {
    if (!err) {
      console.log(
        `Return Building with Building Search Condition: ${
          q ? `q: ${q}` : ""
        }, ${as ? `as: ${as}` : ""}, ${cate ? `cate: ${cate}` : ""}, ${
          isours ? `isours: ${isours}` : ""
        }, ${order ? `order: ${order}` : ""}`
      );
      res.send(result);
    } else {
      console.log("ERR : " + err);
      res.status(404).json({
        error: "Error",
      });
    }
  });
});

// ============================================================
// TEST API : 테스트 용 API (GET, POST)
// ============================================================

// POST Test Api
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

// GET Test Api
router.get("/get/test", (req, res) => {
  /*
  #swagger.tags = ['Test']
  #swagger.summary = 'GET Test Api'
  #swagger.description = 'GET Test Api 입니다.'
*/

  res.status(201).send({ test: "hi" });
});

module.exports = router;
