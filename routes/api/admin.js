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

router.post(
  "/edit/building",
  uploadImgToS3.array("file", 20),
  async (req, res) => {
    const type = req.query?.type ?? null; // type = img | popup | building
    const buildingId = req.query?.id ?? null; // 빌딩 id

    console.log(req);
    console.log(String(req));
    if (req.files === undefined) {
      console.log("Request에 이미지 없음 ! => req.files === undefined");
      res.status(400).send("ERR: No Imgs Given!");
    }
    try {
      const imgUrlsList = req.files.map(
        (fileEl) => fileEl.location.split(".com/")[1]
      );
      if (!imgUrlsList || !imgUrlsList.length > 0) {
        console.log("ERR: imgUrlsList ERROR");
        return;
      }
      console.log(
        "AWS S3에 이미지 업로드 완료 \nAWS S3 imgUrlsList: ",
        imgUrlsList
      ); // imgUrlsList 존재!

      maria.query(
        `UPDATE Buildings SET img="${imgUrlsList.join(
          ","
        )}" WHERE _id=${buildingId};
        SELECT * FROM Buildings WHERE _id=${buildingId};
        `,
        function (err, result) {
          if (!err) {
            console.log(
              `빌딩 ID ${buildingId}의 건물정보 DB에 이미지 추가 성공! \nAWS S3 이미지 DB, Mysql DB에 이미지 ${imgUrlsList.length}개 추가됨`
            );
            res.status(200).send(result[1][0]);
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

router.post(
  "/save/building",
  uploadImgToS3.array("file", 20),
  async (req, res) => {
    if (req.files === undefined) {
      console.log("Request에 이미지 없음 ! => req.files === undefined");
      res.status(400).send("ERR: No Imgs Given!");
    }
    try {
      const imgNameList = req.files.map(
        (fileEl) => fileEl.location.split(".com/")[1]
      );
      if (!imgNameList || !imgNameList.length > 0) {
        console.log("ERR: img Url ERROR");
        return;
      }
      console.log(
        "AWS S3에 이미지 업로드 완료 \nAWS S3 imgNameList: ",
        imgNameList
      ); // imgNameList 존재!

      const parsedBodyData = JSON.parse(req.body?.bodyFormData);
      const { name, address, coord, tag, is_ours, cate } = parsedBodyData;
      //{"name":"ewr","address":"wr","coord":"wer","tag":"","is_ours":"false","cate":"F&B"

      maria.query(
        `INSERT INTO Buildings (name, address, coord, tag, is_ours, cate, img) VALUES ("${name}", "${address}", "${coord}", "${tag}", ${
          is_ours === "true" ? 1 : 0
        }, "${cate}", "${imgNameList.join(",")}");
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

router.put("/update/carousel", function (req, res) {
  /*
  #swagger.tags = ['Test']
  #swagger.summary = 'POST Test Api'
  #swagger.description = 'POST Test Api 입니다.'
*/

  let pageType, carouselType, contentType, contentId;

  try {
    pageType = req.body?.pageType ?? "";
    carouselType = req.body?.carouselType
      ? `"${req.body?.carouselType}"`
      : "null";
    contentType = req.body?.contentType ?? "";
    contentId = req.body?.contentId ?? "";
  } catch (e) {
    console.log("ERR_PARAMS : " + e);
    res.status(400).json({
      error:
        "ERR_PARAMS : 팝업 이름, 팝업 주소, 팝업 좌표, 팝업 종류, 키워드, 팝업 건물은 필수 입력 필드입니다.",
    });
  }

  maria.query(
    `INSERT INTO CarouselContents (pageType, carouselType, contentType, contentId) VALUES ("${pageType}", ${carouselType}, "${contentType}", ${contentId})`,
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

router.post("/save/popup", function (req, res) {
  /*
  #swagger.tags = ['Test']
  #swagger.summary = 'POST Test Api'
  #swagger.description = 'POST Test Api 입니다.'
*/

  let name, date, type, keyword, building;
  try {
    name = req.body.name;
    date = req.body.date;
    type = req.body.type;
    keyword = req.body.keyword;
    building = req.body.building;
  } catch (e) {
    console.log("ERR_PARAMS : " + e);
    res.status(400).json({
      error:
        "ERR_PARAMS : 팝업 이름, 팝업 주소, 팝업 좌표, 팝업 종류, 키워드, 팝업 건물은 필수 입력 필드입니다.",
    });
  }

  console.log(name, date, type, keyword, building);

  maria.query(
    `INSERT INTO Popups (name, date, type, keyword, building) VALUES ("${name}", "${date}", "${type}", "${keyword}", "${building}")`,
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

module.exports = router;
