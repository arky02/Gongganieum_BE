const swaggerAutogen = require("swagger-autogen")();

const doc = {
  info: {
    version: "1.0.0",
    title: "늘품 Server API",
    description: "늘품 팝업 웹 개발 Server API 입니다.",
  },
  host: "ec2-3-34-222-145.ap-northeast-2.compute.amazonaws.com:8080/",
  basePath: "api/",
  schemes: ["http", "https"],
  consumes: ["application/json"],
  produces: ["application/json"],
  tags: [
    {
      name: "Popup",
      description: "Popup 관련 API Requests",
    },
    {
      name: "Building",
      description: "Building 관련 API Requests",
    },
    {
      name: "User",
      description: "User 관련 API Requests",
    },
    {
      name: "찜하기 - User",
      description: "찜하기 - User 관련 API Requests",
    },
    {
      name: "찜하기 - Building",
      description: "찜하기 - Building 관련 API Requests",
    },
    {
      name: "ETC",
      description: "기타 API Requests",
    },
    {
      name: "Test",
      description: "테스트 용 API Requests",
    },
  ],
  securityDefinitions: {
    apiKeyAuth: {
      type: "apiKey",
      in: "header", // can be "header", "query" or "cookie"
      name: "X-API-KEY", // name of the header, query parameter or cookie
      description: "any description...",
    },
  },

  definitions: {},
};

const outputFile = "./swagger_output.json";
const endpointsFiles = ["./routes/api.js"];

swaggerAutogen(outputFile, endpointsFiles, doc);
