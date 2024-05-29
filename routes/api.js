// var openAI = require("openai");
// const openai = new openAI.OpenAI();
var express = require("express");
var router = express.Router();
// var cors = require('cors');
const maria = require("../config/maria");

// get popup info list (type: str, name: str, date: str, address: str, keyword: str, building: str)
router.get("/info/popups", (req, res) => {
  /*
  #swagger.tags = ['GET Requests']
  #swagger.summary = 'GET Request Api'
  #swagger.description = "전체 팝업 리스트의 정보(카테고리, 팝업명, 진행 기간, 진행 장소, 관련 키워드)를 가져오는 GET request 입니다."
*/

  // `SELECT name FROM User WHERE email="${email}"`,
  maria.query(`SELECT * FROM PopupList`, function (err, result) {
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

// get building info list (name: str, address: str, coord: str, iscurrent: str, popups: PopupList[])
router.get("/info/buildings", (req, res) => {
  /*
  #swagger.tags = ['GET Requests']
  #swagger.summary = 'GET Request Api'
  #swagger.description = "전체 건물 리스트의 정보(건물 이름, 주소, 좌표, 현재 팝업 진행 여부, 진행된 팝업 정보 리스트)를 가져오는 GET request 입니다."
*/

  maria.query(`SELECT * FROM BuildingList`, function (err, result) {
    if (!err) {
      console.log("All Building's info are sent");
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
