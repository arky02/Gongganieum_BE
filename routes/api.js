// var openAI = require("openai");
// const openai = new openAI.OpenAI();
var express = require("express");
var router = express.Router();
// var cors = require('cors');
const maria = require("../config/maria");
const axios = require("axios");
const qs = require("qs");
const {
  OAUTH_GET_TOKEN_URL,
  OAUTH_GET_USERINFO_URL,
  OAUTH_CLIENT_SECRET,
  OAUTH_CLIENT_ID,
} = require("../constants.js");

const { makeToken } = require("../utils/jwt.js");
const { getUserInfoFromToken } = require("../utils/decode_token.js");

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

// =================================================================================================
// Popup API : Popup 관련 API (GET) - 1개
// =================================================================================================

router.get("/popup/infos", (req, res) => {
  /*
  #swagger.tags = ['Popup']
  #swagger.summary = '전체 팝업 리스트 정보 리턴'
  #swagger.description = "Response Datatype: Popups[]"
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

// =================================================================================================
// Building API : Building 관련 API (GET) - 3개
// =================================================================================================

router.get("/building/infos", (req, res) => {
  /*
  #swagger.tags = ['Building']
  #swagger.summary = '특정 건물 id의 건물 정보 리턴'
  #swagger.description = "Response Datatype: Buildings[]"
*/

  const id = req.query?.id ?? null;

  maria.query(
    `SELECT b.*, MAX(STR_TO_DATE(SUBSTRING_INDEX(JSON_UNQUOTE(JSON_EXTRACT(popup.value, '$.date')), ' - ', -1), '%y.%m.%d')) AS latest_end_date FROM Buildings b JOIN JSON_TABLE(b.popups, 
      '$[*]' COLUMNS (value JSON PATH '$')) AS popup ${
        id ? `where _id=${id}` : ""
      } GROUP BY b._id;`,
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

router.get("/building/search", (req, res) => {
  /*
  #swagger.tags = ['Building']
  #swagger.summary = '특정 정렬 조건, 필터 조건으로 건물 검색'
  #swagger.description = "Response Datatype: Buildings[]"
*/

  let q = req.query?.q ?? null; // -> where
  const as = req.query?.as ?? "address"; // address(default), building, popup -> where
  const cate = req.query?.cate ?? null; // str -> where
  const isours = req.query?.isours ?? null; // true, false -> where
  const order = req.query?.order ?? "new"; // new(default), popular, (likes)
  const page = req.query?.page ?? null; // 페이지네이션 페이지 번호
  const limit = req.query?.limit ?? null; // 페이지네이션으로 가져올 요소의 개수

  let where_query = [];

  // Where 절 생성
  // popup.popup_name like '${"%" + q + "%"}'

  let q_filter = "b.address";
  if (as === "popup") q_filter = "popup.popup_name";
  if (as === "building") q_filter = "b.name";

  // 1. as 필터로 q 검색어 검색 (공백제거, 일부로 검색)
  if (q)
    where_query.push(
      `REPLACE(${q_filter}, ' ', '') LIKE '${
        "%" + q.replace(/\s+/g, "") + "%"
      }'`
    );

  // 2. cate 필터 적용
  if (cate && cate !== "전체") where_query.push(`b.cate = '${cate}'`);

  // 3. isours 필터 적용
  if (isours !== null) where_query.push(`b.isours = ${isours}`);

  // 4. order 적용
  let order_filter = "earliest_start_date DESC"; // order - new 적용(default)
  if (order === "popular") order_filter = "popups_count DESC";

  // 5. order에 따라 추출해야하는 select 쿼리 적용
  let select_query =
    "MIN(STR_TO_DATE(SUBSTRING_INDEX(popup_date, ' - ', 1), '%y.%m.%d')) AS earliest_start_date"; // order = new (default) 적용
  if (order === "popular")
    select_query = "JSON_LENGTH(b.popups) AS popups_count";

  // 6. 페이지네이션 적용 (page, limit)
  const page_filter =
    page && limit
      ? "LIMIT " + String(limit) + " OFFSET " + String((page - 1) * limit)
      : "";

  console.log("빌딩 검색 조건: ", where_query);
  console.log("정렬 조건: ", order);

  // 전체 SQl Query문 생성
  const query = `
        SELECT 
            b.*,
            MAX(STR_TO_DATE(SUBSTRING_INDEX(popup_date, ' - ', -1), '%y.%m.%d')) AS latest_end_date,
            ${select_query}
        FROM 
            Buildings b
        JOIN 
            JSON_TABLE(
                b.popups, 
                '$[*]' 
                COLUMNS (
                    popup_name VARCHAR(255) PATH '$.name',
                    popup_date VARCHAR(512) PATH '$.date'
                )
            ) AS popup
        ${where_query.length > 0 ? `WHERE ${where_query.join(" AND ")}` : ""}
        GROUP BY 
            b._id
        ORDER BY
            ${order_filter}
        ${page_filter};`;

  console.log(query);

  maria.query(query, function (err, result) {
    if (!err) {
      console.log(
        `Return Building with Building Search Condition: ${
          q ? `q: ${q}` : ""
        }, ${as ? `as: ${as}` : ""}, ${cate ? `cate: ${cate}` : ""}, ${
          isours ? `isours: ${isours}` : ""
        }, ${order ? `order: ${order}` : ""}`
      );
      if (page_filter) console.log(page_filter);
      res.send(result);
    } else {
      console.log("ERR : " + err);
      res.status(404).json({
        error: "Error",
      });
    }
  });
});

// ======================================================================================================================================
// USER API : User 관련 API (GET, GET Authorize, POST, POST Authorize, PATCH Authorize) - 5개
// ======================================================================================================================================

router.get("/user/info", function (req, res) {
  /*
  #swagger.tags = ['User']
  #swagger.summary = '특정 id의 유저 정보 리턴'
  #swagger.description = 'Response Datatype: Users'
*/

  const payload = getUserInfoFromToken(req, res, true);
  if (!payload) return;
  const { userId, role } = payload;

  maria.query(
    `
    SELECT * from Users WHERE _id = ${userId};
    `,
    function (err, result) {
      if (!err) {
        console.log(
          "(Search User Info) 유저 정보 리턴, user id: " + String(userId)
        );
        res.send(result[0]);
      } else {
        console.log(
          "ERR (Search User Info) 해당 아이디의 유저가 없습니다! user id: " +
            String(userId)
        );
        res.status(404).json({
          error: `해당 아이디의 유저가 없습니다! user id: "+ ${String(userId)}`,
        });
      }
    }
  );
});

// Response로 JWT AccessToken(_id, role), Role 정보 보내기
const sendOAuthResDataWithToken = ({ userId, name, role, res }) => {
  const payload = { userId, role };
  console.log("payload", payload);
  const accessToken = makeToken(payload);
  console.log("accessToken", accessToken);
  // const cookiOpt = { maxAge: 1000 * 60 * 60 * 24 };
  // res.cookie("accessToken", accessToken, cookiOpt);

  console.log(`=== 소셜로그인 RES 전송, ROLE: ${role} 처리 완료 ===`);

  res.status(200).json({ accessToken, name, role });

  // return { accessToken, name, role };
};

// TODO: 중복됐을 경우 다른 오류 코드 전송
router.patch("/user/guest/update", function (req, res) {
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
    console.log("ERR ('/user/guest/register') : " + e);
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
        sendOAuthResDataWithToken({
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

router.get("/user/remove", function (req, res) {
  /*
  #swagger.tags = ['User']
  #swagger.summary = '유저 삭제 (탈퇴) - 임시 api'
  #swagger.description = 'Response Datatype: int(삭제한 유저의 id)'
*/

  const id = req.query?.id; // id 안적으면 Test 유저(_id = 1) 정보 리턴

  if (id === 1) {
    console.log(
      "ERR ('/user/remove') : Test 계정(id = 1) 정보는 삭제할 수 없습니다."
    );
    res.status(400).json({
      error: "ERR_PARAMS : Test 계정(id = 1) 정보는 삭제할 수 없습니다.",
    });
  }

  maria.query(
    `
    DELETE from Users WHERE _id = ${id};
    `,
    function (err, result) {
      if (!err) {
        // 성공
        console.log("(Delete User) 유저 삭제 성공, user id: " + String(id));
        res.status(200).json({
          message: "유저 삭제 성공",
          user_id: id,
        });
      } else {
        console.log(
          "ERR (Delete User) 해당 아이디의 유저가 없습니다! user id: " +
            String(id)
        );
        res.status(404).json({
          error: `해당 아이디의 유저가 없습니다! user id: "+ ${String(id)}`,
        });
      }
    }
  );
});

router.get("/user/info/role", function (req, res) {
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

// =================================================================================================
// 찜하기 API : 찜하기 관련 API (GET Authorize, POST Authorize) - 3개
// =================================================================================================

router.get("/user/building/likes", function (req, res) {
  /*
  #swagger.tags = ['찜하기']
  #swagger.summary = '유저가 찜한 빌딩 id 리스트 리턴 - 임시 api'
  #swagger.description = 'Response Datatype: int(건물의 찜하기 개수)'
*/

  const id = req.query?.user; // id 안적으면 Test 유저(_id = 1) 정보 리턴

  maria.query(
    `
    SELECT 
    JSON_ARRAYAGG(buildingId)
    AS buildingIdList
    FROM 
        BuildingLikes
    WHERE 
        userId = ${id};
    `,
    function (err, result) {
      if (!err) {
        // 성공
        console.log(
          "(찜하기) 유저가 찜한 빌딩 id 리스트 출력, user id: " +
            String(id) +
            ", => 결과: " +
            String(result[0])
        );
        res.send(result[0]);
      } else {
        console.log(
          "ERR (찜하기) 유저 찜한 빌딩 id 리스트 리턴 실패! user id: " +
            String(id)
        );
        res.status(400).json({
          error: `에러가 발생했습니다!`,
        });
      }
    }
  );
});

router.post("/user/building/likes", function (req, res) {
  /*
  #swagger.tags = ['찜하기']
  #swagger.summary = '유저의 빌딩 찜하기 리스트에 해당 건물 id 추가/삭제(토글) - 임시 api'
  #swagger.description = 'Response Datatype: null'
*/

  const userId = req.query?.user; // id 안적으면 Test 유저(_id = 1) 정보 리턴
  const buildingId = req.query?.id; // id 안적으면 Test 유저(_id = 1) 정보 리턴

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
        console.log(`해당 유저의 찜하기 목록 출력 - userId: ${userId}`);
        console.log(result[2][0]);
        res.status(200).send(result[1][0]);
      } else {
        console.log(
          "ERR (찜하기) 빌딩 찜하기 실패! user id: " +
            String(userId) +
            ", 건물 id: " +
            String(buildingId)
        );
        res.status(400).json({
          error: `에러가 발생했습니다!`,
        });
      }
    }
  );
});

router.get("/building/likes/count", function (req, res) {
  /*
  #swagger.tags = ['찜하기']
  #swagger.summary = '특정 건물 id의 찜하기 개수 리턴'
  #swagger.description = 'Response Datatype: int(건물의 찜하기 개수)'
*/

  const id = req.query?.id; // id 안적으면 Test 유저(_id = 1) 정보 리턴

  maria.query(
    `
    SELECT buildingId, COUNT(userId) AS likes_count
    FROM BuildingLikes
    WHERE buildingId = ${id}
    GROUP BY buildingId;
    `,
    function (err, result) {
      if (!err) {
        // 성공
        console.log("(빌딩 좋아요 개수 출력) building id: " + String(id));
        res.send(result[0]);
        console.log(result[0]);
      } else {
        console.log("ERR(빌딩 좋아요 개수 출력) building id: " + String(id));
        res.status(404).json({
          error: `해당 아이디의 유저가 없습니다! user id: "+ ${String(id)}`,
        });
      }
    }
  );
});

// =================================================================================================
// 소셜로그인 API : OAuth 소셜로그인 관련 API
// =================================================================================================

const saveOAuthGuestData = ({ name, email, img, res }) => {
  // ROLE: GUEST일 경우 유저데이터 첫 DB저장 처리
  maria.query(
    `INSERT INTO Users(name, email, img) VALUES ("${name}","${email}",${
      img ? '"' + img + '"' : null
    });
      SELECT _id as user_id from Users WHERE email = "${email}";`,
    function (err, result) {
      if (!err) {
        console.log("ROLE: GUEST -> 회원가입 진행");
        console.log(
          "User is registered! UserId: " +
            String(result[1][0]["user_id"]) +
            ", name: " +
            name +
            ", email: " +
            email +
            ", img: " +
            img
        );
        userId = result[1][0]["user_id"]; // 새롭게 추가된 유저의 아이디 (int)

        // ===== ROLE: GUEST SEND RESPONSE  =====
        // 5. Response로 JWT AccessToken(_id, email), Role 정보 보내기
        sendOAuthResDataWithToken({
          userId,
          name,
          role: "GUEST",
          res,
        });
      } else {
        console.log("ERR (소셜로그인) : " + err);
        console.log(
          "Error Query: " +
            `INSERT INTO Users(name, email, img) VALUES ("${name}","${email}",${
              img ? '"' + img + '"' : null
            });
      SELECT _id as user_id from Users WHERE email = "${email}";`
        );
        res.status(409).json({
          error: "body 형식이 틀리거나 데이터베이스에 문제가 발생했습니다.",
        });
      }
    }
  );
};

router.get("/oauth/callback", async (req, res) => {
  // OAuth Provider = kakao | naver
  let oauthProvider = req.query.provider;
  console.log(`==== OAUTH LOGIN , Provider: ${oauthProvider} ====`);

  // 1. Authorization Code로 naver 서비스 AccessToken 획독
  let token;
  try {
    const url = OAUTH_GET_TOKEN_URL[oauthProvider];
    const body = qs.stringify({
      grant_type: "authorization_code",
      client_id: OAUTH_CLIENT_ID[oauthProvider],
      client_secret: OAUTH_CLIENT_SECRET[oauthProvider],
      redirectUri: `http://localhost:3000/oauth/${oauthProvider}`,
      code: req.query.code, // 프론트로부터 받은 Authorization Code
      state: null, // state는 네이버만
    });
    const header = { "content-type": "application/x-www-form-urlencoded" };
    const response = await axios.post(url, body, header);
    token = response.data.access_token;
  } catch (err) {
    console.log(err);
    console.log("ERR: Error while getting Authorization Code");
    res.status(400).send("ERR: Error while getting Authorization Code");
  }
  console.log("token", token);

  // 2. AccessToken으로 naver 유저 정보 획득
  let oauthUserInfoRes;
  try {
    const url = OAUTH_GET_USERINFO_URL[oauthProvider];
    const Header = {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
    const response = await axios.get(url, Header);

    if (oauthProvider === "naver") {
      oauthUserInfoRes = response?.data?.response;
      console.log("== NAVER User Info Response == ", response?.data?.response);
    } else {
      oauthUserInfoRes = response?.data?.properties;
      console.log(
        "== KAKAO == User Info Response ==",
        response?.data?.properties
      );
    }
  } catch (err) {
    console.log(err);
  }
  // const { name, email, profile_image: img } = oauthUserInfoRes; => 네이버
  // const { nickname: name, profile_image: img } = oauthUserInfoRes; => 카카오

  const name =
    oauthProvider === "naver"
      ? oauthUserInfoRes.name
      : oauthUserInfoRes.nickname;
  const email =
    oauthProvider === "naver" ? oauthUserInfoRes.email : name + "@naver.com";
  const img = oauthUserInfoRes.profile_image;

  // 3. UserRole 체크, 회원가입 필요 여부 확인
  let userId = "";
  maria.query(
    `SELECT role, _id from Users WHERE email = "${email}";`,
    function (err, result) {
      if (err) {
        console.log("ERR: User Role Check Query ", err);
        return;
      }
      if (!result[0]) {
        // role 존재 X, 회원 정보 없음
        // == ROLE: GUEST ==
        console.log("== ROLE: GUEST ==");
        console.log(`신규 유저! EMAIL ${email}, => 회원가입 진행`);

        // DB에 유저 정보 최초 저장 (게스트 회원가입)
        saveOAuthGuestData({ name, email, img, res });
      } else {
        // role 존재 O, 이미 회원이거나 게스트
        // == ROLE: USER OR GUEST ==
        const userRole = result[0]?.role; // int
        userId = result[0]?._id;

        console.log(`== ROLE: ${userRole} ==`);
        console.log(`EMAIL: ${email}, 아이디: ${userId}`);

        // ===== ROLE: USER OR GUEST SEND RESPONSE  =====
        // 5. Response로 JWT AccessToken(_id, email), Role 정보 보내기
        sendOAuthResDataWithToken({
          userId,
          name,
          role: userRole,
          res,
        });
        return;
      }
    }
  );
});

// =================================================================================================
//  문의하기 페이지 API
// =================================================================================================

router.post("/contact", function (req, res) {
  /*
  #swagger.tags = ['Test']
  #swagger.summary = 'POST Test Api'
  #swagger.description = 'POST Test Api 입니다.'
*/
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
    buildingId,
    userId;

  try {
    buildingId = req.body.buildingId; // 필수 입력 field
    userId = req.body.userId; // 필수 입력 field
    name = req.body?.name ?? "";
    phone = req.body?.phone ?? "";
    email = req.body?.email ?? "";
    company = req.body?.company ?? "";
    date1 = req.body?.date1 ?? "";
    date2 = req.body?.date2 ?? "";
    budget = req.body?.budget ?? "";
    reason = req.body?.reason ?? "";
    enterpath = req.body?.enterpath ?? "";
    requests = req.body?.requests ?? "";
  } catch (e) {
    console.log("ERR (get request) : " + e);
    res.status(400).json({
      error: "ERR_PARAMS : buildingId is required",
    });
  }

  const contactPostQuery = `${buildingId}, ${userId}, "${name}", "${phone}", "${email}", "${company}", "${date1}", "${date2}", "${budget}", "${reason}", "${enterpath}", "${requests}"`;
  console.log("문의 내용: ", contactPostQuery);

  maria.query(
    `INSERT INTO ContactMsg(buildingId, userId, name, phone, email, company, date1, date2, budget, reason, enterpath, requests) VALUES (${contactPostQuery});`,
    function (err) {
      if (!err) {
        console.log("(문의하기) 문의가 작성되었습니다!");
        res.status(201).json({
          message: "문의가 작성되었습니다!",
        });
      } else {
        console.log("ERR (문의하기) : " + err);
        res.status(409).json({
          error: "body 형식이 틀리거나 데이터베이스에 문제가 발생했습니다.",
        });
      }
    }
  );
});

// =================================================================================================
//  관리자 페이지 API
// =================================================================================================

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

// /admin/add/building
// /admin/edit/building?type=(img|popup|building)&id=int

router.post(
  "/admin/edit/building",
  upload.array("file", 20),
  async (req, res) => {
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
  }
);

// =================================================================================================
//  공공데이터 API
// =================================================================================================

router.get("/data/address_code", async (req, res) => {
  /*
  #swagger.tags = ['공공데이터']
  #swagger.summary = '공공데이터 - 주소 코드'
  #swagger.description = ""
*/

  const address = req.query.address;

  const response = await axios.get(
    `https://api.vworld.kr/req/search?service=search&request=search&version=2.0&crs=EPSG:900913&size=10&page=1&query=${address}&type=address&category=road&format=json&errorformat=json&key=ACD06AF5-4717-3696-8A0F-13A93EEC7187`
  );
  console.log("공공데이터 API - address code:  ", response?.data ?? "");

  res.send(response?.data ?? "");
});

router.get("/data/building_info", async (req, res) => {
  /*
  #swagger.tags = ['공공데이터']
  #swagger.summary = '공공데이터 - 건축물대장'
  #swagger.description = ""
*/

  const sigunguCd = req.query.sigunguCd;
  const bjdongCd = req.query.bjdongCd;
  const bun = req.query.bun;
  const ji = req.query.ji;

  const response = await axios.get(
    `https://apis.data.go.kr/1613000/BldRgstService_v2/getBrTitleInfo?sigunguCd=${sigunguCd}&bjdongCd=${bjdongCd}&bun=${bun}&ji=${ji}&ServiceKey=${process.env.PUB_DATA_SERVICE_KEY}`
  );
  console.log("공공데이터 API - building info: ", response?.data ?? "");

  res.send(response?.data ?? "");
});

router.get("/data/area_info", async (req, res) => {
  /*
  #swagger.tags = ['공공데이터']
  #swagger.summary = '공공데이터 - 지역데이터'
  #swagger.description = ""
*/

  const area = req.query.area;

  const response = await axios.get(
    `http://openapi.seoul.go.kr:8088/4c5458685467776c37364e7a734d58/xml/citydata_ppltn/1/5/${area}`
  );
  console.log("공공데이터 API - area info: ", response?.data ?? "");
  console.log("공공데이터 API - area info: ", response ?? "");

  res.send(response?.data ?? "");
});

// =================================================================================================
// TEST API : 테스트 용 API (GET, POST) - 2개
// =================================================================================================

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

router.get("/get/test", (req, res) => {
  /*
  #swagger.tags = ['Test']
  #swagger.summary = 'GET Test Api'
  #swagger.description = 'GET Test Api 입니다.'
*/

  res.status(201).send({ test: "hi" });
});

module.exports = router;

// 빌딩 아이디에 해당하는 빌딩의 좋아요 숫자 출력

// SELECT buildingId, COUNT(userId) AS likes_count
// FROM BuildingLikes
// WHERE buildingId = 101
// GROUP BY buildingId;

// 해당 유저가 누른 빌딩 좋아요 id 리스트 -> 빌딩 id 리스트 반환됨

// SELECT buildingId
// FROM BuildingLikes
// WHERE userId = @userId;
