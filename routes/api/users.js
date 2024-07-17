// ======================================================================================================================================
// User 관련 API - Root Endpoint: /api/user
// ======================================================================================================================================

var express = require("express");
var router = express.Router();
const maria = require("../../config/maria.js");

const { getUserInfoFromToken } = require("../../utils/decode_token.js");
const sendOAuthDataWithToken = require("../../utils/send_token");

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

// 유저 정보 PATCH (수정)
router.patch("/info", function (req, res) {
  /*
  #swagger.tags = ['User']
  #swagger.summary = '특정 id의 유저 정보 리턴'
  #swagger.description = 'Response Datatype: Users'
*/

  // 유저 정보 추출
  const payload = getUserInfoFromToken(req, res, true);
  if (!payload) return;
  const { userId } = payload;

  // Body 정보 추출
  let nickname, company, brand, tag, description;
  try {
    nickname = req.body.nickname;
    company = req.body.company;
    brand = req.body.brand;
    tag = req.body?.tag ?? "";
    description = req.body?.description ?? "";
  } catch (e) {
    console.log("ERR (get request) : " + e);
    res.status(400).json({
      error: "ERR_PARAMS : nickname, company, brand는 필수 입력 필드입니다.",
    });
  }

  maria.query(
    `
    UPDATE Users SET nickname="${nickname}", company="${company}", brand="${brand}", tag="${tag}", description="${description}" WHERE _id = ${userId};
    `,
    function (err, result) {
      if (!err) {
        console.log(
          "(PATCH User Info) 유저 정보 수정 성공, user id: " + String(userId)
        );
        res.send(result[0]);
      } else {
        console.log(
          "ERR (PATCH User Info) 해당 아이디의 유저가 없습니다! user id: " +
            String(userId)
        );
        res.status(404).json({
          error: `해당 아이디의 유저가 없습니다! user id: "+ ${String(userId)}`,
        });
      }
    }
  );
});

// TODO: 중복됐을 경우 다른 오류 코드 전송
router.patch("/guest/update", function (req, res) {
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
