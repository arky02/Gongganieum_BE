var express = require("express");
var router = express.Router();
const maria = require("../config/maria");

// Res: Popups(_id: int, name: str, type: str, date: str, address: str, keyword: str, building: str)
router.get("/infos", (req, res) => {
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
