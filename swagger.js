const swaggerAutogen = require("swagger-autogen")();

const doc = {
  info: {
    version: "1.0.0",
    title: "늘품 Server API",
    description: "늘품 팝업 웹 개발 Server API 입니다.",
  },
  host: "localhost:3000",
  basePath: "/",
  schemes: ["http", "https"],
  consumes: ["application/json"],
  produces: ["application/json"],
  tags: [
    {
      name: "Test",
      description: "테스트 용 API 입니다.",
    },
    {
      name: "GET Requests",
      description: "GET Request 관련 API 입니다.",
    },
    {
      name: "POST Requests",
      description: "POST Request 관련 API 입니다.",
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
const endpointsFiles = ["./routes/index.js", "./routes/api.js"];

swaggerAutogen(outputFile, endpointsFiles, doc);
