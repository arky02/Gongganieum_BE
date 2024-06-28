// var openAI = require("openai");
// const openai = new openAI.OpenAI();
var express = require("express");
var router = express.Router();
// var cors = require('cors');
const maria = require("../config/maria");
const axios = require("axios");
const qs = require("qs");

const { makeToken } = require("../utils/jwt.js");
const alert_and_move = require("../utils/alert_and_move.js");

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
  if (cate) where_query.push(`b.cate = '${cate}'`);

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

  const id = req.query?.id ?? 1; // id 안적으면 Test 유저(_id = 1) 정보 리턴

  maria.query(
    `
    SELECT * from Users WHERE _id = ${id};
    `,
    function (err, result) {
      if (!err) {
        console.log(
          "(Search User Info) 유저 정보 리턴, user id: " + String(id)
        );
        res.send(result[0]);
      } else {
        console.log(
          "ERR (Search User Info) 해당 아이디의 유저가 없습니다! user id: " +
            String(id)
        );
        res.status(404).json({
          error: `해당 아이디의 유저가 없습니다! user id: "+ ${String(id)}`,
        });
      }
    }
  );
});

// TODO: 중복됐을 경우 다른 오류 코드 전송
router.post("/user/register", function (req, res) {
  /*
 #swagger.tags = ['User']
  #swagger.summary = '유저 생성 (회원가입)'
  #swagger.description = 'Response Datatype: int(생성한 유저의 ID)'
*/
  let name = null,
    nickname = null,
    email = null,
    description = null,
    img = null,
    company = null,
    brand = null,
    product = null,
    tag = null;

  try {
    name = req.body.name;
    nickname = req.body.nickname;
    email = req.body.email;
    description = req.body?.description
      ? '"' + req.body?.description + '"'
      : null;
    img = req.body?.img ? '"' + req.body?.img + '"' : null;
    company = req.body.company;
    brand = req.body.brand;
    product = req.body.product;
    tag = req.body.tag;

    console.log(
      `INSERT INTO Users(name, nickname, email, description, img, company, brand, product, tag) VALUES ("${name}", "${nickname}", "${email}", ${description}, ${img}, "${company}", "${brand}", "${product}", "${tag}")`
    );
  } catch (e) {
    console.log("ERR ('/user/register') : " + e);
    res.status(400).json({
      error:
        "ERR_PARAMS : name, nickname, email, company, brand, product, tag는 필수 입력 값입니다.",
    });
  }

  maria.query(
    `
    INSERT INTO Users(name, nickname, email, description, img, company, brand, product, tag) VALUES ("${name}", "${nickname}", "${email}", ${description}, ${img}, "${company}", "${brand}", "${product}", "${tag}");
    SELECT _id as user_id from Users WHERE email = "${email}";
    `,
    function (err, result) {
      if (!err) {
        console.log(
          "(User Register) User is saved! name : " +
            name +
            ", user id: " +
            result
        );
        res.status(201).send(result[1][0]);
      } else {
        console.log(
          "ERR (User Register) user name : " +
            name +
            ", user id: " +
            String(result) +
            "/ Error content: " +
            err
        );
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
    select count(buildingId) as count from BuildingLikes where userId=${userId} and buildingId=${buildingId};
    `,
    function (err, result) {
      if (!err) {
        // 성공
        console.log(
          "(찜하기) 빌딩 찜하기 성공, user id: " +
            String(userId) +
            ", 건물 id: " +
            String(buildingId) +
            ", => 결과: " +
            result[1][0]
        );
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

router.get("/naver/callback", async (req, res) => {
  let token;
  try {
    const url = "	https://nid.naver.com/oauth2.0/token";
    const body = qs.stringify({
      grant_type: "authorization_code",
      client_id: "8_nLWgqOkGlSkyVVYEGj",
      client_secret: "3YDZdvIDsf",
      redirectUri: "http://localhost:3000/oauth/naver",
      code: req.query.code,
      state: null,
    });
    const header = { "content-type": "application/x-www-form-urlencoded" };
    const response = await axios.post(url, body, header);
    token = response.data.access_token;
  } catch (err) {
    console.log(err);
    console.log("에러1");
    res.send("에러1");
  }

  console.log("token", token);

  try {
    const url = "https://openapi.naver.com/v1/nid/me";
    const Header = {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
    const response = await axios.get(url, Header);
    console.log(response);

    // data: {
    //   resultcode: '00',
    //   message: 'success',
    //   response: {
    //     id: 'IL3MaH6AHrU-pIIuSJyoHw0C5opTzf9ZZ0R3xk9LKqg',
    //     email: 'kyean07@naver.com',
    //     name: '김기연'
    //   }
    // }

    // const { nickname, profile_image: img } = response.data.properties;
    // const payload = { nickname, img };
    // console.log(payload);
    // const accessToken = makeToken(payload);
    // const cookiOpt = { maxAge: 1000 * 60 * 60 * 24 };

    // DB에 유저 정보 1차 저장

    // maria.query(
    //   `
    //   SELECT buildingId, COUNT(userId) AS likes_count
    //   FROM BuildingLikes
    //   WHERE buildingId = ${id}
    //   GROUP BY buildingId;
    //   `,
    //   function (err, result) {
    //     if (!err) {
    //       // 성공
    //       console.log("(빌딩 좋아요 개수 출력) building id: " + String(id));
    //       res.send(result[0]);
    //       console.log(result[0]);
    //     } else {
    //       console.log("ERR(빌딩 좋아요 개수 출력) building id: " + String(id));
    //       res.status(404).json({
    //         error: `해당 아이디의 유저가 없습니다! user id: "+ ${String(id)}`,
    //       });
    //     }
    //   }
    // );

    res.cookie("accessToken", accessToken, cookiOpt);
    res
      .status(200)
      .json({ accessToken: accessToken, nickname: nickname, img: img });

    // res.redirect("/");
  } catch (err) {
    console.log(err);
  }
});

router.get("/kakao/callback", async (req, res) => {
  let token;
  try {
    const url = "https://kauth.kakao.com/oauth/token";
    const body = qs.stringify({
      grant_type: "authorization_code",
      client_id: "10e27455bc8bc405be98a80e91415931",
      client_secret: "ONXbCwm2AOtJv0olZK69kioV45nttCb3",
      redirectUri: "http://localhost:3000/oauth/kakao",
      code: req.query.code,
    });
    const header = { "content-type": "application/x-www-form-urlencoded" };
    const response = await axios.post(url, body, header);
    token = response.data.access_token;
  } catch (err) {
    console.log(err);
    console.log("에러1");
    res.send("에러1");
  }

  console.log("token", token);

  try {
    const url = "https://kapi.kakao.com/v2/user/me";
    const Header = {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
    const response = await axios.get(url, Header);
    console.log(response.data.properties);
    const { nickname, profile_image: img } = response.data.properties;
    const payload = { nickname, img };
    console.log(payload);
    const accessToken = makeToken(payload);
    const cookiOpt = { maxAge: 1000 * 60 * 60 * 24 };

    // DB에 유저 정보 1차 저장

    // maria.query(
    //   `
    //   SELECT buildingId, COUNT(userId) AS likes_count
    //   FROM BuildingLikes
    //   WHERE buildingId = ${id}
    //   GROUP BY buildingId;
    //   `,
    //   function (err, result) {
    //     if (!err) {
    //       // 성공
    //       console.log("(빌딩 좋아요 개수 출력) building id: " + String(id));
    //       res.send(result[0]);
    //       console.log(result[0]);
    //     } else {
    //       console.log("ERR(빌딩 좋아요 개수 출력) building id: " + String(id));
    //       res.status(404).json({
    //         error: `해당 아이디의 유저가 없습니다! user id: "+ ${String(id)}`,
    //       });
    //     }
    //   }
    // );

    res.cookie("accessToken", accessToken, cookiOpt);
    res
      .status(200)
      .json({ accessToken: accessToken, nickname: nickname, img: img });

    // res.redirect("/");
  } catch (err) {
    console.log(err);
  }
});

// =================================================================================================
//  공공데이터 API
// =================================================================================================

router.get("/data/address_code", async (req, res) => {
  /*
  #swagger.tags = ['Popup']
  #swagger.summary = '전체 팝업 리스트 정보 리턴'
  #swagger.description = "Response Datatype: Popups[]"
*/

  const address = req.query.address;

  const response = await axios.get(
    `https://api.vworld.kr/req/search?service=search&request=search&version=2.0&crs=EPSG:900913&size=10&page=1&query=${address}&type=address&category=road&format=json&errorformat=json&key=ACD06AF5-4717-3696-8A0F-13A93EEC7187`
  );
  console.log("공공데이터 API - ", response?.data ?? "");

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
