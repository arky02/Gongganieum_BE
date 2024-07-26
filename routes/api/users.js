// ======================================================================================================================================
// User 관련 API - Root Endpoint: /api/user
// ======================================================================================================================================

var express = require("express");
var router = express.Router();
const maria = require("../../config/maria.js");

const { getUserInfoFromToken } = require("../../utils/decode_token.js");
const sendOAuthDataWithToken = require("../../utils/send_token");

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

// 유저 전체 정보 리스트 GET
router.get("/infos", (req, res) => {
  /*
  #swagger.tags = ['User']
  #swagger.summary = '전체 유저 정보 리스트 리턴
  #swagger.description = "Response Datatype: Users[]"
*/

  maria.query(`SELECT * FROM Users`, function (err, result) {
    if (!err) {
      console.log("All User's info are sent");
      res.send(result);
    } else {
      console.log("ERR : " + err);
      res.status(404).json({
        error: "Error",
      });
    }
  });
});

// 유저 정보 GET
router.get("/info", function (req, res) {
  /*
  #swagger.tags = ['User']
  #swagger.summary = '특정 id의 유저 정보 리턴'
  #swagger.description = 'Response Datatype: Users'
*/

  const payload = getUserInfoFromToken(req, res, true);
  if (!payload) return;
  const { userId } = payload;

  maria.query(
    `
    SELECT * from Users WHERE _id = ${userId};
    `,
    function (err, result) {
      if (!err) {
        console.log(
          "(GET User Info) 유저 정보 리턴 성공, user id: " + String(userId)
        );
        res.send(result[0]);
      } else {
        console.log(
          "ERR (GET User Info) 해당 아이디의 유저가 없습니다! user id: " +
            String(userId)
        );
        res.status(404).json({
          error: `해당 아이디의 유저가 없습니다! user id: "+ ${String(userId)}`,
        });
      }
    }
  );
});

// 유저 정보 PUT (수정)
router.put("/info", uploadImgToS3.single("file"), async (req, res) => {
  /*
  #swagger.tags = ['User']
  #swagger.summary = '특정 id의 유저 정보 리턴'
  #swagger.description = 'Response Datatype: Users'
*/

  let imgUrl = null;
  if (req.file === undefined) {
    console.log("Request에 이미지 없음, 프로필 이미지 수정 X");
  } else {
    imgUrl = req.file.location;
    if (!imgUrl || !imgUrl.length > 0) {
      console.log("ERR: imgUrlsList ERROR");
      return;
    }
    console.log("AWS S3에 이미지 업로드 완료 \nAWS S3 imgUrl: ", imgUrl);
  }

  // 유저 정보 추출
  const payload = getUserInfoFromToken(req, res, true);
  if (!payload) return;
  const { userId } = payload;

  // Body 정보 추출
  const parsedBodyData = JSON.parse(req.body?.bodyData);
  const { nickname, company, brand, tag, description } = parsedBodyData;

  const query = `
  UPDATE Users SET nickname="${nickname}", company="${company}", brand="${brand}", tag="${tag}", description="${description}" ${
    imgUrl ? ", img='" + imgUrl + "'" : ""
  } WHERE _id = ${userId};
  `;
  console.log(query);

  maria.query(query, function (err, result) {
    if (!err) {
      console.log(
        "(PUT User Info) 유저 정보 수정 성공, user id: " + String(userId)
      );
      res.send(result[0]);
    } else {
      console.log(
        "ERR (PUT User Info) 해당 아이디의 유저가 없습니다! user id: " +
          String(userId)
      );
      res.status(404).json({
        error: `해당 아이디의 유저가 없습니다! user id: "+ ${String(userId)}`,
      });
    }
  });
});

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

// TODO: 중복됐을 경우 다른 오류 코드 전송
router.put("/guest/update", function (req, res) {
  /*
 #swagger.tags = ['User']
  #swagger.summary = '유저 정보 업데이트 (회원가입)'
  #swagger.description = ''
*/
  // Authorization Header Token으로부터 payload 정보 추출
  const payload = getUserInfoFromToken(req, res, true);
  if (!payload) return;
  const { userId: guestId } = payload; // 회원정보를 추가시킬 guest의 id

  console.log(`== 유저 정보 업데이트(회원가입) 게스트 id:  ${guestId} ==`);

  let nickname = null,
    description = null,
    company = null,
    brand = null,
    tag = null;

  try {
    nickname = req.body.nickname ? '"' + req.body?.nickname + '"' : null;
    description = req.body?.description
      ? '"' + req.body?.description + '"'
      : null;
    company = req.body?.company ? '"' + req.body?.company + '"' : null;
    brand = req.body.brand ? '"' + req.body?.brand + '"' : null;
    tag = req.body.tag ? '"' + req.body?.tag + '"' : null;

    console.log(
      `
    UPDATE Users SET nickname=${nickname}, company=${company}, brand=${brand}, tag=${tag}, description=${description}, role="USER" WHERE _id=${guestId};
    `
    );
  } catch (e) {
    console.log("ERR ('/guest/register') : " + e);
    res.status(400).json({
      error:
        "ERR_PARAMS : 유저 정보 업데이트 - nickname, company, brand, tag는 필수 입력 값입니다.",
    });
  }

  // 유저 정보 업데이트
  maria.query(
    `
    UPDATE Users SET nickname=${nickname}, company=${company}, brand=${brand}, tag=${tag}, description=${description}, role="USER" WHERE _id=${guestId};
    `,
    function (err, result) {
      if (!err) {
        console.log(
          "(Guest Info Update) 게스트 정보 업데이트 완료 => ROLE: USER로 변경"
        );

        //회원가입 완료 -> send api response with JWT AccessToken
        sendOAuthDataWithToken({
          userId: guestId,
          name: "",
          role: "USER",
          res,
        });
      } else {
        console.log("ERR (Guest Info Update)  Error content: " + err);
        res.status(409).json({
          error: "body 형식이 틀리거나 데이터베이스에 문제가 발생했습니다.",
        });
      }
    }
  );
});

router.get("/remove", function (req, res) {
  /*
  #swagger.tags = ['User']
  #swagger.summary = '유저 삭제 (탈퇴)'
  #swagger.description = 'Response Datatype: int(삭제한 유저의 id)'
*/

  // Authorization Header Token으로부터 유저 정보 추출
  const payload = getUserInfoFromToken(req, res, true);
  if (!payload) return;
  const { userId } = payload;

  if (userId === 1) {
    console.log(
      "ERR ('/remove') : Test 계정(id = 1) 정보는 삭제할 수 없습니다."
    );
    res.status(400).json({
      error: "ERR_PARAMS : Test 계정(id = 1) 정보는 삭제할 수 없습니다.",
    });
  }

  maria.query(
    `
    DELETE from Users WHERE _id = ${userId};
    `,
    function (err, result) {
      if (!err) {
        // 성공
        console.log("(Delete User) 유저 삭제 성공, user id: " + String(userId));
        res.status(200).json({
          message: "유저 삭제 성공",
          user_id: userId,
        });
      } else {
        console.log(
          "ERR (Delete User) 해당 아이디의 유저가 없습니다! user id: " +
            String(userId)
        );
        res.status(404).json({
          error: `해당 아이디의 유저가 없습니다! user id: "+ ${String(userId)}`,
        });
      }
    }
  );
});

router.get("/info/role", function (req, res) {
  /*
  #swagger.tags = ['User']
  #swagger.summary = '유저의 ROLE 상태 확인'
*/

  // Authorization Header Token으로부터 유저 정보 추출
  const payload = getUserInfoFromToken(req, res, false);
  if (!payload) return;
  const { userId, role } = payload;

  console.log(`유저 ROLE 체크 => userId: ${userId}, user_role: ${role}`);

  if (role) {
    res.status(200).json({
      user_role: role,
    });
  } else {
    res.status(400).json({
      error: `에러가 발생했습니다!`,
    });
  }
});

router.get("/nickname_check", function (req, res) {
  /*
  #swagger.tags = ['User']
  #swagger.summary = '유저 닉네임 중복 검사'
  
*/

  let nickname = req.query?.nickname ?? null; // -> where

  maria.query(
    `
    SELECT _id FROM Users WHERE nickname="${nickname}";
    `,
    function (err, result) {
      if (!err) {
        let isValid = false;
        if (result.length < 1) {
          isValid = true;
        }
        console.log("닉네임 중복 체크 => is_valid: ", isValid);
        console.log("해당 닉네임으로 검색된 유저 id");
        console.log(result[0]);
        res.status(200).json({ is_valid: isValid });
      } else {
        // console.log(
        //   "ERR (Delete User) 해당 아이디의 유저가 없습니다! user id: " +
        //     String(userId)
        // );
        console.log(err);
        res.status(404).json(err);
      }
    }
  );
});

// =================================================================================================
// 찜하기 API : 찜하기 관련 API (GET Authorize, POST Authorize) - 3개
// =================================================================================================

router.get("/building/likes", function (req, res) {
  /*
  #swagger.tags = ['찜하기']
  #swagger.summary = '유저가 찜한 빌딩 id 리스트 리턴 - 임시 api'
  #swagger.description = 'Response Datatype: int(건물의 찜하기 개수)'
*/

  // Authorization Header Token으로부터 유저 정보 추출
  const payload = getUserInfoFromToken(req, res, true);
  if (!payload) return;
  const { userId } = payload;

  maria.query(
    `
    SELECT 
    JSON_ARRAYAGG(buildingId)
    AS buildingIdList
    FROM 
        BuildingLikes
    WHERE 
        userId = ${userId};
    `,
    function (err, result) {
      if (!err) {
        // 성공
        console.log(
          "(찜하기) 유저가 찜한 빌딩 id 리스트 출력, user id: " +
            String(userId) +
            ", => 결과: " +
            String(result[0])
        );
        res.send(result[0]);
      } else {
        console.log(
          "ERR (찜하기) 유저 찜한 빌딩 id 리스트 리턴 실패! user id: " +
            String(userId)
        );
        res.status(400).json({
          error: `에러가 발생했습니다!`,
        });
      }
    }
  );
});

router.post("/building/likes", function (req, res) {
  /*
  #swagger.tags = ['찜하기']
  #swagger.summary = '유저의 빌딩 찜하기 리스트에 해당 건물 id 추가/삭제(토글) - 임시 api'
  #swagger.description = 'Response Datatype: null'
*/

  // Authorization Header Token으로부터 유저 정보 추출
  const payload = getUserInfoFromToken(req, res, true);
  if (!payload) return;
  const { userId } = payload;

  let buildingId;
  try {
    buildingId = req.body.buildingId;
  } catch (e) {
    console.log("ERR (get request) : " + e);
    res.status(400).json({
      error: "ERR_PARAMS : 빌딩 id는 필수 입력 값입니다.",
    });
  }

  console.log(userId);
  console.log("userId");
  console.log(buildingId);
  console.log("buildingId");

  maria.query(
    `
    CALL ToggleLikes(${userId}, ${buildingId});
    SELECT count(buildingId) as count from BuildingLikes where userId=${userId} and buildingId=${buildingId};
    SELECT JSON_ARRAYAGG(buildingId) AS buildingIdList FROM BuildingLikes WHERE userId = ${userId};
    `,
    function (err, result) {
      if (!err) {
        // 성공
        console.log(
          "(찜하기) 빌딩 찜하기 성공, user id: " +
            String(userId) +
            ", 건물 id: " +
            String(buildingId) +
            ", => 결과: "
        );
        console.log(result[1][0]);
        console.log(`해당 유저가 찜한 건물 id 리스트 출력 (userId: ${userId})`);
        console.log(result[2][0]);
        res.status(200).send(result[1][0]);
      } else {
        console.log(
          "ERR (찜하기) 빌딩 찜하기 실패! user id: " +
            userId +
            ", 건물 id: " +
            buildingId
        );
        res.status(400).json({
          error: `에러가 발생했습니다!`,
        });
      }
    }
  );
});

module.exports = router;
