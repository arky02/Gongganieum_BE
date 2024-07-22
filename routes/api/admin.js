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

// router.post(
//   "/edit/building",
//   uploadImgToS3.array("file", 20),
//   async (req, res) => {
//     const type = req.query?.type ?? null; // type = img | popup | building
//     const buildingId = req.query?.id ?? null; // 빌딩 id

//     if (req.files === undefined) {
//       console.log("Request에 이미지 없음 ! => req.files === undefined");
//       res.status(400).send("ERR: No Imgs Given!");
//     }
//     try {
//       const imgUrlsList = req.files.map((fileEl) => fileEl.location);
//       if (!imgUrlsList || !imgUrlsList.length > 0) {
//         console.log("ERR: imgUrlsList ERROR");
//         return;
//       }
//       console.log(
//         "AWS S3에 이미지 업로드 완료 \nAWS S3 imgUrlsList: ",
//         imgUrlsList
//       ); // imgUrlsList 존재!

//       maria.query(
//         `UPDATE Buildings SET img="${imgUrlsList.join(
//           ","
//         )}" WHERE _id=${buildingId};
//         SELECT * FROM Buildings WHERE _id=${buildingId};
//         `,
//         function (err, result) {
//           if (!err) {
//             console.log(
//               `빌딩 ID ${buildingId}의 건물정보 DB에 이미지 추가 성공! \nAWS S3 이미지 DB, Mysql DB에 이미지 ${imgUrlsList.length}개 추가됨`
//             );
//             res.status(200).send(result[1][0]);
//           } else {
//             console.log("ERR : " + err);
//             res.status(500).json({
//               error: "Error",
//             });
//           }
//         }
//       );
//     } catch (e) {
//       console.log(e);
//       if (e === "LIMIT_UNEXPECTED_FILE") {
//         res.status(500).send("이미지 크기가 초과되었습니다.");
//         return;
//       } else {
//         res.status(500).send("SERVER ERROR");
//       }
//     }
//   }
// );

router.post(
  "/save/building",
  uploadImgToS3.array("file", 20),
  async (req, res) => {
    /*
  #swagger.tags = ['Test']
  #swagger.summary = 'POST Test Api'
  #swagger.description = 'POST Test Api 입니다.'
*/

    let imgUrlsList = null;
    if (req.files === undefined) {
      console.log("Request에 이미지 없음 ! => req.files === undefined");
    } else {
      imgUrlsList = req.file.location;
      if (!imgUrlsList || !imgUrlsList.length > 0) {
        console.log("ERR: imgUrlsLists ERROR");
        return;
      }
      console.log(
        "AWS S3에 이미지 업로드 완료 \nAWS S3 imgUrlsList: ",
        imgUrlsList
      );
    }

    let name, address, coord, tag, is_ours, cate, img;
    try {
      name = req.body.name;
      address = req.body.address;
      coord = req.body.coord;
      tag = req.body?.tag ?? "";
      is_ours = req.body.is_ours;
      cate = req.body.cate;
      img = req.body.img;
    } catch (e) {
      console.log("ERR_PARAMS : " + e);
      res.status(400).json({
        error:
          "ERR_PARAMS : 건물 이름, 건물 주소, 건물 좌표, 직영 건물 여부, 카테고리, 건물 이미지는 필수 입력 필드입니다.",
      });
    }

    console.log(name, address, coord, tag, is_ours, cate, img);

    res.status(200).json({ message: "good" });

    // maria.query(
    //   `INSERT INTO Buildings(name, address, coord, tag, is_ours, cate, img) VALUES ("${name}", "${address}", "${coord}", "${tag}", ${is_ours}, "${cate}", "${img}")`,
    //   function (err) {
    //     if (!err) {
    //       console.log("(Save User) User is saved : " + name);
    //       res.status(200).json({
    //         message: "User is saved",
    //       });
    //     } else {
    //       console.log("ERR (Save User) : " + err);
    //       res.status(409).json({
    //         error: "body 형식이 틀리거나 데이터베이스에 문제가 발생했습니다.",
    //       });
    //     }
    //   }
    // );
  }
);

router.post("/save/popup", function (req, res) {
  /*
  #swagger.tags = ['Test']
  #swagger.summary = 'POST Test Api'
  #swagger.description = 'POST Test Api 입니다.'
*/

  let name, address, type, keyword, building;
  try {
    name = req.body.name;
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

  console.log(name, address, date, type, keyword, building);

  // maria.query(
  //   `INSERT INTO Buildings(name, address, coord, tag, is_ours, cate, img) VALUES ("${name}", "${address}", "${coord}", "${tag}", ${is_ours}, "${cate}", "${img}")`,
  //   function (err) {
  //     if (!err) {
  //       console.log("(Save User) User is saved : " + name);
  //       res.status(200).json({
  //         message: "User is saved",
  //       });
  //     } else {
  //       console.log("ERR (Save User) : " + err);
  //       res.status(409).json({
  //         error: "body 형식이 틀리거나 데이터베이스에 문제가 발생했습니다.",
  //       });
  //     }
  //   }
  // );
});

module.exports = router;
