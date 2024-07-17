var express = require("express");
var router = express.Router();
const maria = require("../config/maria.js");

// =================================================================================================
// Popup API : Popup 관련 API (GET) - 1개
// =================================================================================================

router.get("/infos", (req, res) => {
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

module.exports = router;
