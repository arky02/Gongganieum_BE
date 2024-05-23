const express = require("express");
const app = express();
const port = 3333; // port 번호 설정
const bodyParser = require("body-parser");
const cors = require("cors");
var indexRouter = require("./index");
var apiRouter = require("./api");
var createError = require("http-errors");

// DB
// var maria = require("./config/maria");
// maria.connect();

// CORS Setup
var allowlist = ["http://localhost:3000"];
var corsOptionsDelegate = function (req, callback) {
  var corsOptions;
  if (allowlist.indexOf(req.header("Origin")) !== -1) {
    corsOptions = { origin: true }; // reflect (enable) the requested origin
  } else {
    corsOptions = { origin: false };
  }
  callback(null, corsOptions); // error, options
};

//body-parser 모듈을 불러온다.
app.use(bodyParser.json()); //요청 본문을 json 형태로 파싱
app.use(bodyParser.urlencoded({ extended: false })); //

app.use(cors(corsOptionsDelegate));

app.use("/", indexRouter);
app.use("/api", apiRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

app.set("port", process.env.PORT || 3333);
app.set("host", process.env.HOST || "0.0.0.0");

app.use(
  cors({
    origin(req, res) {
      console.log("접속된 주소: " + req),
        -1 == allowlist.indexOf(req) && req
          ? res(Error("허가되지 않은 주소입니다."))
          : res(null, !0);
    },
    credentials: !0,
    optionsSuccessStatus: 200,
  })
);

// app.get("/", function (req, res) {
//   res.send("접속된 아이피: " + req.ip);
// });

app.listen(app.get("port"), app.get("host"), () =>
  console.log(
    "Server is running on : " + app.get("host") + ":" + app.get("port")
  )
);

module.exports = app;
