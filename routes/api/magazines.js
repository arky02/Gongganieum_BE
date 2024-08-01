// =================================================================================================
// Magazine 관련 API - Root Endpoint: /api/magazine
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
      cb(null, Date.now().toString()); //업로드시 파일명 변경가능
    },
  }),
});

// 매거진 이미지 업로드
router.post("/upload_image", uploadImgToS3.single("file"), async (req, res) => {
  /*
  #swagger.tags = ['Magazine']
  #swagger.summary = 'Magazine 이미지 업로드'
  #swagger.description = 'POST Test Api 입니다.'
*/

  let imgUrl = null;
  if (req.file === undefined) {
    console.log("Request에 이미지 없음");
  } else {
    imgUrl = req.file.location;
    if (!imgUrl || !imgUrl.length > 0) {
      console.log("ERR: imgUrlsList ERROR");
      return;
    }
    console.log("AWS S3에 이미지 업로드 완료 \nAWS S3 imgUrl: ", imgUrl);
  }
  res.send({ image_url: imgUrl });
});

// 전체 매거진 목록 get
router.get("/infos", (req, res) => {
  /*
  #swagger.tags = ['Magazine']
  #swagger.summary = '매거진 전체 목록 get'
  #swagger.description = ''
*/

  maria.query(`SELECT * FROM Magazines;`, function (err, result) {
    if (!err) {
      console.log("(GET 매거진 전체 데이터) 전체 매거진 목록 Sent");
      res.status(200).json(result);
    } else {
      console.log("ERR (GET 매거진 전체 데이터) : " + err);
      res.status(400).json({
        error: err.message ?? err,
      });
    }
  });
});

// 특정 매거진 상세 페이지 HTML get
router.get("/contentHTML", (req, res) => {
  /*
  #swagger.tags = ['Magazine']
  #swagger.summary = '매거진 특정 매거진 상세 페이지 HTML get'
  #swagger.description = ''
*/

  let id;

  try {
    id = req.query.id;
  } catch (e) {
    // 필수 입력 field 입력 여부 검증
    console.log("ERR (get request) : " + e);
    res.status(400).json({
      error:
        "ERR_PARAMS : 상세 페이지 HTML을 조회할 매거진 id를 req param으로 보내야 합니다.",
    });
  }

  maria.query(
    `SELECT contentHTML FROM MagazineDetails WHERE magazineId=${id};`,
    function (err, result) {
      if (!err) {
        console.log(
          "(GET 매거진 상세 페이지) 특정 매거진 상세 페이지 HTML Sent"
        );
        res.status(200).json(result);
      } else {
        console.log("ERR (GET 매거진 상세 페이지) : " + err);
        res.status(400).json({
          error: err.message ?? err,
        });
      }
    }
  );
});

// 매거진 작성
router.post("/", function (req, res) {
  /*
  #swagger.tags = ['Magazine']
  #swagger.summary = '매거진 작성하기'
  #swagger.description = ''
*/

  let title, cate, date, writer, img, contentHTML;

  try {
    title = req.body.title;
    cate = req.body.cate;
    date = req.body.date;
    writer = req.body.writer;
    img = req.body?.img ?? "";
    contentHTML = req.body.contentHTML;
  } catch (e) {
    // 필수 입력 field 입력 여부 검증
    console.log("ERR (get request) : " + e);
    res.status(400).json({
      error:
        "ERR_PARAMS : title, cate, date, writer, contentHTML은 필수 입력 필드 값 입니다.",
    });
  }

  const magazineInsertContent = `"${title}", "${cate}", "${date}", "${writer}", "${img}"`;
  console.log("새 매거진 추가: ", magazineInsertContent);

  console.log("log test");

  console.log(`INSERT INTO Magazines (title, cate, date, writer, img) VALUES (${magazineInsertContent});
    INSERT INTO MagazineDetails (magazineId, contentHTML) VALUES (LAST_INSERT_ID(), "${contentHTML}")
    `);

  maria.query(
    `INSERT INTO Magazines (title, cate, date, writer, img) VALUES (${magazineInsertContent});
    INSERT INTO MagazineDetails (magazineId, contentHTML) VALUES (LAST_INSERT_ID(), "${contentHTML}");
    `,
    function (err) {
      if (!err) {
        console.log("(매거진 작성) 새 매거진이 작성되었습니다!");
        res.status(201).json({
          message: "매거진이 작성되었습니다!",
        });
      } else {
        console.log("ERR (매거진 작성) : " + err);
        res.status(409).json({
          error: "body 형식이 틀리거나 데이터베이스에 문제가 발생했습니다.",
        });
      }
    }
  );
});

module.exports = router;
