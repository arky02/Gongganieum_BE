const express = require("express");
const cors = require("cors");
const app = express();
const port = 8080; // port 번호 설정
const bodyParser = require("body-parser");
var createError = require("http-errors");

// router 설정
var apiRouter = require("./routes/api");
var adminRouter = require("./routes/api/admin");
var buildingRouter = require("./routes/api/buildings");
var magazineRouter = require("./routes/api/magazines");
var oauthRouter = require("./routes/api/oauth");
var popupRouter = require("./routes/api/popups");
var publicDataRouter = require("./routes/api/public_data");
var userRouter = require("./routes/api/users");

// 서버 접속 기본 엔진 설정
const path = require("path");
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Swagger setting
const swaggerUi = require("swagger-ui-express");
const swaggerFile = require("./swagger_output.json");

// DB
var maria = require("./config/maria");
maria.connect();

var allowlist = [
  "http://localhost:3000",
  "https://localhost:3000",
  "http://ec2-3-23-49-89.us-east-2.compute.amazonaws.com",
  "http://ec2-3-34-222-145.ap-northeast-2.compute.amazonaws.com",
  "https://neul-pum.vercel.app",
];

app.use((req, res, next) => {
  console.log("\t");
  console.log("====================== NEW REQ START =====================");
  console.log("Received request:", req.method, req.url);
  next();
});

app.use(
  cors((req, callback) => {
    const origin = req.header("Origin");
    // console.log("CORS Origin Check:", origin);
    const corsOptions = allowlist.includes(origin)
      ? { origin: true }
      : { origin: false };
    callback(null, corsOptions);
  })
);

// Use Swagger
app.use("/swagger", swaggerUi.serve, swaggerUi.setup(swaggerFile));

//body-parser 모듈을 불러온다.
app.use(bodyParser.json()); //요청 본문을 json 형태로 파싱
app.use(bodyParser.urlencoded({ extended: false })); //

// endpoint root 주소 매핑
app.use("/api/popup", popupRouter);
app.use("/api/building", buildingRouter);
app.use("/api/magazine", magazineRouter);
app.use("/api/user", userRouter);
app.use("/api/oauth", oauthRouter);
app.use("/api/data", publicDataRouter);
app.use("/api/admin", adminRouter);
app.use("/api", apiRouter); // 기타 api들

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

app.listen(port, () => {
  console.log(`listening on port ${port}`);
});

module.exports = app;
