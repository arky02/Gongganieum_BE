// =================================================================================================
// Building 관련 API - Root Endpoint: /api/building
// =================================================================================================

var express = require("express");
var router = express.Router();
const maria = require("../../config/maria");

router.get("/infos", (req, res) => {
  /*
  #swagger.tags = ['Building']
  #swagger.summary = '건물 정보 리턴 (전체 조회, id로 특정 건물 조회)'
*/

  const id = req.query?.id ?? null;

  maria.query(
    `SELECT b.*, 
      IFNULL(
          MAX(
              STR_TO_DATE(
                  SUBSTRING_INDEX(
                      JSON_UNQUOTE(
                          JSON_EXTRACT(popup.value, '$.date')
                      ), ' - ', -1
                  ), '%y.%m.%d'
              )
          ), 
          NULL
      ) AS latest_end_date
    FROM Buildings b
    LEFT JOIN JSON_TABLE(
        b.popups, 
        '$[*]' COLUMNS (value JSON PATH '$')
    ) AS popup 
    ON b.popups IS NOT NULL
    ${id ? `where _id=${id}` : ""}
    GROUP BY b._id;
`,

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

router.get("/search", (req, res) => {
  /*
  #swagger.tags = ['Building']
  #swagger.summary = '특정 정렬 조건, 필터 조건으로 건물 검색'
  #swagger.description = "Response Datatype: Buildings[]"
*/

  let q = req.query?.q ?? null; // -> where
  const as = req.query?.as ?? "address"; // address(default), building, popup -> where
  const cate = req.query?.cate ?? null; // str -> where
  const isours = req.query?.isours === "true" ? true : false; // true, false(default) -> where
  const iscurrent = req.query?.iscurrent === "true" ? true : false; // true, false(default) -> where
  const order = req.query?.order ?? "new"; // new(default), popular, (likes)
  const page = req.query?.page ?? null; // 페이지네이션 페이지 번호
  const limit = req.query?.limit ?? null; // 페이지네이션으로 가져올 요소의 개수

  let where_query = [];

  // Where 절 생성
  // popup.popup_name like '${"%" + q + "%"}'

  let q_filter = "b.address";
  if (as === "popup") q_filter = "popup.popup_name";
  if (as === "building") q_filter = "b.name";

  // 1. where절 - as 필터로 q 검색어 검색 (공백제거, 일부로 검색)
  if (q)
    where_query.push(
      `REPLACE(${q_filter}, ' ', '') LIKE '${
        "%" + q.replace(/\s+/g, "") + "%"
      }'`
    );

  // 2. where절 - cate 필터 적용
  if (cate && cate !== "전체") where_query.push(`b.cate = '${cate}'`);

  // 3. where절 - isours 필터 적용
  if (isours) where_query.push(`b.isours = 1`);

  // 4. order 적용
  let order_filter = "earliest_start_date DESC"; // order - new 적용(default)
  if (order === "popular") order_filter = "popups_count DESC";

  // 5. order에 따라 추출해야하는 select 쿼리 적용
  let order_select_query =
    "MIN(STR_TO_DATE(SUBSTRING_INDEX(popup_date, ' - ', 1), '%y.%m.%d')) AS earliest_start_date"; // order = new (default) 적용
  if (order === "popular")
    order_select_query = "JSON_LENGTH(b.popups) AS popups_count";

  // 1차 기본 쿼리 생성
  let outerQuery = `
        SELECT 
            b.*,
            IFNULL( MAX(STR_TO_DATE(SUBSTRING_INDEX(popup_date, ' - ', -1), '%y.%m.%d')), NULL) AS latest_end_date,
            ${order_select_query}
        FROM 
            Buildings b
            LEFT JOIN JSON_TABLE(
                b.popups, 
                '$[*]' 
                COLUMNS (
                    popup_name VARCHAR(255) PATH '$.name',
                    popup_date VARCHAR(512) PATH '$.date'
                )
            ) AS popup
        ON b.popups IS NOT NULL
        ${where_query.length > 0 ? `WHERE ${where_query.join(" AND ")}` : ""}
        GROUP BY 
            b._id`;

  // 6. iscurrent 필터 적용 (outer query의 where절)
  let iscurrent_where_query = "";
  if (iscurrent) {
    const subQuery = outerQuery;
    outerQuery = `
      SELECT
          subquery.*,
          subquery.latest_end_date,
          subquery.earliest_start_date
      FROM (
          ${subQuery}
      ) AS subquery`;
    iscurrent_where_query = "WHERE DATE(subquery.latest_end_date) > CURDATE()";
  }

  // 전체 개수 출력용 쿼리 (페이지네이션 적용 X)
  const query_without_page_filter = `
  ${outerQuery} 
  ${iscurrent_where_query}
  ORDER BY
      ${iscurrent ? "subquery." + order_filter : order_filter}`;

  // 7. 페이지네이션 적용 (page, limit)
  const page_filter =
    page && limit
      ? "LIMIT " + String(limit) + " OFFSET " + String((page - 1) * limit)
      : "";

  // 페이지네이션 적용한 전체 쿼리
  const query = `
      ${query_without_page_filter}
      ${page_filter};
      `;

  console.log("빌딩 검색 조건: ", where_query);
  console.log("정렬 조건: ", order);
  console.log(query);

  maria.query(
    `${page_filter ? query_without_page_filter + ";" : ""} 
    ${query}`,
    function (err, result) {
      if (!err) {
        console.log(
          `Return Building with Building Search Condition: ${
            q ? `q: ${q}` : ""
          }, ${as ? `as: ${as}` : ""}, ${cate ? `cate: ${cate}` : ""}, ${
            isours ? `isours: ${isours}` : ""
          },${iscurrent ? `iscurrent: ${iscurrent}` : ""}, ${
            order ? `order: ${order}` : ""
          }`
        );
        if (page_filter) console.log(page_filter);
        console.log(result.length);
        const responseData = page_filter
          ? { count: result[0].length, result: result[1] }
          : { result: result };
        res.send(responseData);
      } else {
        console.log("ERR : " + err);
        res.status(404).json({
          error: "Error",
        });
      }
    }
  );
});

router.get("/likes/count", function (req, res) {
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

module.exports = router;
