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
  paths: {
    "/": {
      get: {
        tags: "Test",
        description: "Test for API GET request",
        responses: {
          default: {
            description: "",
          },
        },
      },
    },
    "/save/user": {
      post: {
        tags: "Test",
        description: "Test for API POST request",
        parameters: [
          {
            name: "body",
            in: "body",
            schema: {
              type: "object",
              properties: {
                name: {
                  example: "NeulPum",
                },
                age: {
                  example: 20,
                },
              },
            },
          },
        ],
        responses: {
          200: {
            description: "OK",
          },
          400: {
            description: "Bad Request",
          },
          409: {
            description: "Conflict",
          },
        },
      },
    },
    "/gettest": {
      get: {
        tags: "Test",
        description: "",
        responses: {
          201: {
            description: "Created",
          },
        },
      },
    },
    "/popupinfos": {
      get: {
        description:
          "잔체 팝업 리스트의 정보(카테고리, 팝업명, 진행 기간, 진행 장소, 관련 키워드)를 가져오는 GET request 입니다.",
        responses: {
          200: {
            description: "OK",
          },
          404: {
            description: "Not Found",
          },
        },
      },
    },
  },
  definitions: {},
};

const outputFile = "./swagger_output.json";
const endpointsFiles = ["./routes/index.js", "./routes/api.js"];

swaggerAutogen(outputFile, endpointsFiles, doc);
