// var openAI = require("openai");
// const openai = new openAI.OpenAI();
var express = require("express");
var router = express.Router();
// var cors = require('cors');
const maria = require("../config/maria");

//save user
router.post("/save/user", function (req, res) {
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
          error: "Already registered email",
        });
      }
    }
  );
});

//return name
router.get("/gettest", (req, res) => {
  /*
  #swagger.tags = ['Test']
  #swagger.summary = 'GET Test Api'
  #swagger.description = 'GET Test Api 입니다.'
*/

  res.status(201).send({ test: "hi" });

  // maria.query(
  //   `SELECT name FROM User WHERE email="${email}"`,
  //   function (err, result) {
  //     if (!err) {
  //       console.log("(Return name) Name is sended : " + result);
  //       res.send(result);
  //     } else {
  //       console.log("ERR (Return name) : " + err);
  //       res.status(404).json({
  //         error: "Cannot find name",
  //       });
  //     }
  //   }
  // );
});

// //save chat
// router.post("/save/chat", function (req, res) {
//   var email = "";
//   var chat = "";
//   const date_string = getDateString();
//   try {
//     email = req.body.email;
//     chat = JSON.stringify(req.body.chat);
//     console.log(chat);
//   } catch (e) {
//     console.log("ERR (get request) : " + e);
//     res.status(400).json({
//       error: "ERR_PARAMS : email or chat is not valid",
//     });
//   }
//   maria.query(
//     `INSERT INTO RawMessage(user_email, chat_list, is_delivered, date) VALUES ("${email}", '${chat}', 0, "${date_string}")`,
//     function (err) {
//       if (!err) {
//         console.log("(Save Messages) Chat is saved : " + email);
//         res.status(200).json({
//           message: "Chat is saved",
//         });
//       } else {
//         console.log("ERR (Save Chat) : " + err);
//         res.status(409).json({
//           error: "Failed to save chat",
//         });
//       }
//     }
//   );
// });

//return popup info list
router.get("/infos", (req, res) => {
  /*
  #swagger.tags = ['GET Requests']
  #swagger.summary = 'GET Test Api'
  #swagger.description = "전체 팝업 리스트의 정보(카테고리, 팝업명, 진행 기간, 진행 장소, 관련 키워드)를 가져오는 GET request 입니다."
*/

  // `SELECT name FROM User WHERE email="${email}"`,
  maria.query(`SELECT * FROM PopupList`, function (err, result) {
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

// //chatting api
// router.post("/chat", async function (req, res) {
//   var req_message_list = [
//     {
//       role: "system",
//       content: `너는 한국에 살고 있는 여자 고양이, 리티야.
// 너는 매일 밤, 너의 친구의 하루가 어땠는지 물어보고, 그의 이야기를 들어줘야 해.
// 해결책을 제시하지 말고 거의 모든 말에 진심으로 공감해주고, 그 주제에 대해 추가적인 질문을 하면서 자연스럽게 대화를 이어나가. 더 이상 할 말이 없을 경우, 오늘 다른 일은 없었는지 물어봐

// - 너는 1살이고 초등학교 고학년 수준의 언어를 구사해.
// - 너는 다정하고 친근하며, 사랑스러운 수다쟁이야.
// - 한 번에 한 가지 질문만 해
// - 답변은 세 문장 이하로 말해

// 사용자가 자신의 하루에 대해 이야기하기를 마쳤다고 말하는 경우에는 이 메시지를 보내.
// '너의 하루에 대해서 이야기 해줘서 고맙다냥🐾 내일 아침에 일기를 보내줄게! 좋은 꿈 꿔 잘자냥😽'  `,
//     },
//   ];
//   try {
//     const message_list = req.body.message;
//     console.log(message_list);
//     var last_user_input = "";
//     message_list.forEach((msg) => {
//       var m_content = msg.content;
//       var msg_construct = {
//         role: msg.id == "user" ? "user" : "assistant",
//         content: m_content,
//       };
//       req_message_list.push(msg_construct);
//       console.log(msg_construct);
//       last_user_input = msg.content;
//     });
//   } catch (e) {
//     console.log("ERR (chat) : " + e);
//     res.status(400).json({
//       error: "Message param is not valid.",
//     });
//   }
//   const completion = await openai.chat.completions.create({
//     messages: req_message_list,
//     temperature: 0.65,
//     max_tokens: 150,
//     top_p: 0.6,
//     frequency_penalty: 0.1,
//     presence_penalty: 0.1,
//     model: "gpt-3.5-turbo",
//   });
//   const chat_response_string = completion.choices[0].message.content;
//   console.log(chat_response_string);
//   try {
//     res.status(200).json({
//       id: "ritty",
//       content: chat_response_string,
//     });
//     return;
//   } catch (e) {
//     console.log(
//       "ERR (chat) :" + e + " / origin chat return : " + chat_response_string
//     );
//   }
// });

// function getDateString() {
//   // Get Current Date
//   const today = new Date();
//   const year = today.getFullYear();
//   const month = today.getMonth() + 1; // 0 - is January
//   const date = today.getDate();

//   console.log("Month : " + month);

//   const date_string =
//     year +
//     "-" +
//     (month >= 10 ? month : "0" + month) +
//     "-" +
//     (date >= 10 ? date : "0" + date);

//   return date_string;
// }
module.exports = router;
