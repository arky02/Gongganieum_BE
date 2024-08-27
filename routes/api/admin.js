// =================================================================================================
//  관리자 페이지 API - Root Endpoint: /api/admin
// =================================================================================================

var express = require("express");
var router = express.Router();
const maria = require("../../config/maria");

const { S3Client } = require("@aws-sdk/client-s3");
const multer = require("multer");
const multerS3 = require("multer-s3");
const s3 = new S3Client({
  region: "ap-northeast-2", // 서울
  credentials: {
    accessKeyId: process.env.S3_KEY,
    secretAccessKey: process.env.S3_SECRET,
  },
});

// aws s3 이미지 업로드 함수
const uploadImgToS3 = multer({
  storage: multerS3({
    s3: s3,
    bucket: "poppop-bucket",
    key: function (요청, file, cb) {
      cb(null, `${Date.now()}_${file.originalname}`); //업로드시 파일명 변경가능
    },
  }),
});

// =================================================================================================
// Auth API : 에디터 / 관리자 비밀번호 GET
// =================================================================================================
router.post("/authorize", function (req, res) {
  /*
  #swagger.tags = ['Admin']
  #swagger.summary = '에디터 / 관리자 권한 Authorize'
  #swagger.description = ''
*/

  var pwd = "",
    user = "";

  try {
    pwd = req.body.pwd;
    user = req.body.user;
  } catch (e) {
    console.log("ERR (get request) : " + e);
    res.status(400).json({
      error:
        "ERR_PARAMS : 검증할 관리자의 이름과 비밀번호 값을 Body로 보내야 합니다.",
    });
  }

  maria.query(
    `SELECT pwd FROM Auth WHERE user="${user}";`,
    function (err, result) {
      if (err) {
        console.log("ERR (Get PWD) : " + err);
        res.status(409).json({
          error: "body 형식이 틀리거나 데이터베이스에 문제가 발생했습니다.",
        });
        return;
      }
      const correctPwd = result[0]?.pwd;

      console.log("검증 요청 관리자: ", user);
      console.log("입력한 비밀번호: ", pwd);
      console.log("비밀번호: ", correctPwd);

      // no error, check authorization
      if (correctPwd === pwd) {
        console.log("(Get PWD) 관리자 인증 완료!");
        res.status(200).json({
          isAuthorized: true,
        });
      } else {
        console.log("(Get PWD) 관리자 인증 실패 - 비밀번호 오류");
        res.status(400).json({
          isAuthorized: false,
        });
      }
    }
  );
});

// =================================================================================================
// Editor API : 에디터 관련 API
// =================================================================================================

const getBuildingNameStrList = (req) => {
  if (req.files === undefined) {
    console.log("Request에 이미지 없음 ! => req.files === undefined");
    console.log("AWS S3 이미지 업로드 PASS");
    return "";
  }

  // img 목록 존재!
  const imgNameList = req.files.map(
    (fileEl) => fileEl.location.split(".com/")[1]
  );

  if (imgNameList && imgNameList.length > 0) {
    console.log(
      "AWS S3에 이미지 업로드 완료 \nAWS S3 imgNameList: ",
      imgNameList
    );
    const imgNameListToStr = imgNameList ? imgNameList.join(",") : "";
    return imgNameListToStr;
  }

  console.log("ERR: img URL ERROR");
  return "";
};

// Buildings 관련 API (save, edit)
// 건물 정보 추가
router.post(
  "/save/building",
  uploadImgToS3.array("file", 20),
  async (req, res) => {
    try {
      const addedBuildingImgList = getBuildingNameStrList(req);

      const parsedBodyData = JSON.parse(req.body?.buildingFormData);
      const { name, address, coord, tag, isours, cate } = parsedBodyData;

      maria.query(
        `INSERT INTO Buildings (name, address, coord, tag, isours, cate, img) VALUES ("${name}", "${address}", "${coord}", "${tag}", ${
          isours === "true" ? 1 : 0
        }, "${cate}", "${addedBuildingImgList}");
        `,
        function (err, result) {
          if (!err) {
            console.log(`Buildings DB에 건물 추가 성공!`);
            res.status(200).send({ message: "건물 등록에 성공하였습니다." });
          } else {
            console.log("ERR : " + err);
            res.status(500).json({
              error: "Error",
            });
          }
        }
      );
    } catch (e) {
      console.log(e);
      if (e === "LIMIT_UNEXPECTED_FILE") {
        res.status(500).send("이미지 크기가 초과되었습니다.");
        return;
      } else {
        res.status(500).send("SERVER ERROR");
      }
    }
  }
);

// 건물 정보 수정
router.put(
  "/edit/building",
  uploadImgToS3.array("file", 20),
  async (req, res) => {
    try {
      const parsedBodyData = JSON.parse(req.body?.buildingFormData);
      console.log(parsedBodyData);
      const {
        _id,
        name,
        address,
        coord,
        tag,
        isours,
        cate,
        img: initialBuildingImgList,
        popups = "[]",
      } = parsedBodyData;

      const updatedImgList =
        initialBuildingImgList ?? "" + getBuildingNameStrList(req);

      console.log("initialBuildingImgList", initialBuildingImgList);
      console.log("updatedImgList;", updatedImgList);

      // JSON 문자열을 JavaScript 객체로 파싱
      let parsedPopups;
      try {
        parsedPopups = JSON.parse(popups);
      } catch (e) {
        console.error("Invalid JSON string for popups:", popups);
        parsedPopups = [];
      }
      console.log("parsedPopups", parsedPopups);
      // JSON 배열을 SQL 쿼리에 전달할 수 있도록 문자열로 변환
      const popupsArrayString = parsedPopups
        .map((popup) => `'${popup}'`)
        .join(",");
      console.log("popupsArrayString", popupsArrayString);
      const queryString = `UPDATE Buildings SET name = "${name}", address="${address}", coord="${coord.replaceAll(
        " ",
        ""
      )}", tag="${tag}", isours=${isours}, cate="${cate}", img="${updatedImgList}", popups=JSON_ARRAY(${popupsArrayString}) where _id=${_id};`;

      console.log(queryString);

      maria.query(queryString, [popups], function (err, result) {
        if (!err) {
          console.log(`ID: ${_id}의 건물 정보 수정 완료!`);
          res
            .status(200)
            .send({ message: `ID: ${_id}의 건물 수정에 성공하였습니다.` });
        } else {
          console.log("MYSQL_QUERY_ERR : " + err);
          res.status(500).json({
            error: "Error",
          });
        }
      });
    } catch (e) {
      console.log(e);
      if (e === "LIMIT_UNEXPECTED_FILE") {
        res.status(500).send("이미지 크기가 초과되었습니다.");
        return;
      } else {
        res.status(500).send("SERVER ERROR");
      }
    }
  }
);

// Popup 관련 API (save, edit)
// 팝업 데이터 추가
router.post("/save/popup", function (req, res) {
  /*
  #swagger.tags = ['Test']
  #swagger.summary = 'POST Test Api'
  #swagger.description = 'POST Test Api 입니다.'
*/

  let name, date, type, keyword, buildingId;
  try {
    name = req.body.name;
    date = req.body.date;
    type = req.body.type;
    keyword = req.body.keyword;
    buildingId = req.body.buildingId;
  } catch (e) {
    console.log("ERR_PARAMS : " + e);
    res.status(400).json({
      error:
        "ERR_PARAMS : 팝업 이름, 팝업 주소, 팝업 좌표, 팝업 종류, 키워드, 팝업 건물은 필수 입력 필드입니다.",
    });
  }

  console.log("추가할 팝업 정보");
  console.log(
    `name: ${name}, date: ${date}, type: ${type}, keyword: ${keyword}, buildingId: ${buildingId}`
  );

  maria.query(
    `INSERT INTO Popups (name, date, type, keyword, buildingId) VALUES ("${name}", "${date}", "${type}", "${keyword}", "${buildingId}");

    SET @recent_popup_buildingId = (
        SELECT buildingId
        FROM Popups
        WHERE _id = LAST_INSERT_ID()
    );

    UPDATE Buildings
    SET popups = (
        SELECT JSON_ARRAYAGG(JSON_OBJECT('name', popup_val.name, 'date', popup_val.date, 'type', popup_val.type, 'keyword', popup_val.keyword))
        FROM (
            SELECT Popups.name, Popups.date, Popups.type, Popups.keyword
            FROM Popups
            WHERE Popups.buildingId = @recent_popup_buildingId
            ) AS popup_val
        )
    WHERE Buildings._id = @recent_popup_buildingId;
    `,
    function (err) {
      if (!err) {
        console.log(`Popups DB에 팝업 정보 추가 성공!`);
        res.status(200).send({ message: "팝업 정보 등록에 성공하였습니다." });
      } else {
        console.log("ERR : " + err);
        res.status(500).json({
          error: "Error",
        });
      }
    }
  );
});

// Carousel 관련 API (save, edit)
// 캐러셀 데이터 추가
router.post("/save/carousel", function (req, res) {
  /*
  #swagger.tags = ['Test']
  #swagger.summary = 'POST Test Api'
  #swagger.description = 'POST Test Api 입니다.'
*/

  let pageType, carouselType, contentType, contentId;

  try {
    pageType = req.body?.pageType;
    carouselType = req.body?.carouselType
      ? `"${req.body?.carouselType}"`
      : "null";
    contentType = req.body?.contentType;
    contentId = req.body?.contentId;
  } catch (e) {
    console.log("ERR_PARAMS : " + e);
    res.status(400).json({
      error:
        "ERR_PARAMS : pageType, carouselType, contentType, contentId는 필수 입력 필드입니다.",
    });
  }

  maria.query(
    `INSERT INTO CarouselContents (pageType, carouselType, contentType, contentId) VALUES ("${pageType}", ${carouselType}, "${contentType}", ${contentId});
    CALL update_Carousel_content_data(LAST_INSERT_ID(), "Buildings", ${contentId});`,
    function (err) {
      if (!err) {
        console.log(`CarouselContents DB에 캐러셀 정보 추가 성공!`);
        res.status(200).send({ message: "캐러셀 정보 등록에 성공하였습니다." });
      } else {
        console.log("ERR : " + err);
        res.status(500).json({
          error: "Error",
        });
      }
    }
  );
});

// 캐러셀 데이터 수정
router.put("/edit/carousel", function (req, res) {
  /*
  #swagger.tags = ['Test']
  #swagger.summary = 'POST Test Api'
  #swagger.description = 'POST Test Api 입니다.'
*/

  let id, contentId, pageType, carouselType, contentType;

  try {
    id = req.body.id;
    contentId = req.body.contentId;
    pageType = req.body.pageType;
    carouselType = req.body.carouselType;
    contentType = req.body.contentType;
  } catch (e) {
    console.log("ERR_PARAMS : " + e);
    res.status(400).json({
      error: "ERR_PARAMS : id, contentId는 필수 입력 쿼리입니다.",
    });
  }

  const query = `UPDATE CarouselContents SET contentId = ${contentId}, pageType="${pageType}", carouselType="${carouselType}", contentType="${contentType}" WHERE _id = ${id};
    CALL update_Carousel_content_data(${id}, "Buildings", ${contentId});`;

  maria.query(query, function (err) {
    if (!err) {
      console.log(`캐러셀 컨텐츠 정보 수정 성공!`);
      res
        .status(200)
        .send({ message: "캐러셀 컨텐츠 정보 수정 성공하였습니다." });
    } else {
      console.log("ERR : " + err);
      res.status(500).json({
        error: "Error",
      });
    }
  });
});

// 정보 삭제
router.delete("/delete/:tableType", function (req, res) {
  /*
  #swagger.tags = ['Test']
  #swagger.summary = 'POST Test Api'
  #swagger.description = 'POST Test Api 입니다.'
*/

  const tableType = req.params.tableType;
  let id, tableName;

  try {
    id = req.query.id ?? null;

    switch (tableType) {
      case "carousel":
        tableName = "CarouselContents";
        break;
      case "building":
        tableName = "Buildings";
        break;
      case "user":
        tableName = "Users";
        break;
      case "popup":
        tableName = "Popups";
        break;
      case "contact":
        tableName = "ContactMsg";
        break;
      case "magazine":
        tableName = "Magazines";
        break;
      default:
        console.log("tableType에 맞는 DB table 없음");
        console.log("tableType: ", tableType);
        tableName = "none";
        throw new Error();
    }
  } catch (e) {
    console.log("ERR_PARAMS : " + e);
    res.status(400).json({
      error:
        tableName === "none"
          ? `ERR_PARAMS: tableType에 맞는 DB table 없음, 입력 tableType: ${tableType}`
          : "ERR_PARAMS : id는 필수 입력 쿼리입니다.",
    });
  }

  maria.query(`DELETE FROM ${tableName} WHERE _id=${id};`, function (err) {
    if (!err) {
      console.log(`${tableName}테이블의 id ${id} 정보 삭제 성공`);
      res
        .status(200)
        .send({ message: `${tableName}테이블의 id ${id} 정보 삭제 성공` });
    } else {
      console.log("ERR : " + err);
      res.status(500).json({
        error: "Error",
      });
    }
  });
});

module.exports = router;
