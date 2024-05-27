var express = require("express");
var router = express.Router();

/* GET home page. */
router.get("/", function (req, res, next) {
  /*
  #swagger.tags = ['Test']
  #swagger.summary = 'GET Test Api'
  #swagger.description = 'GET Test Api 입니다.'
  #swagger.security = [{
      "bearerAuth": []
  }]
*/
  res.render("index", { title: "Express" });
});

module.exports = router;
