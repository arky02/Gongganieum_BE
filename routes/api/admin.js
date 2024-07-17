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
const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: "poppop-bucket",
    key: function (요청, file, cb) {
      cb(null, Date.now().toString()); //업로드시 파일명 변경가능
    },
  }),
});

router.post("/edit/building", upload.array("file", 20), async (req, res) => {
  const type = req.query?.type ?? null; // type = img | popup | building
  const buildingId = req.query?.id ?? null; // 빌딩 id

  if (req.files === undefined) {
    console.log("Request에 이미지 없음 ! => req.files === undefined");
    res.status(400).send("ERR: No Imgs Given!");
  }
  try {
    const imgUrlsList = req.files.map((fileEl) => fileEl.location);
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
});

module.exports = router;
