const request = require("supertest");
var cheerio = require("cheerio");

const db = require("../models/index");
const app = require("../app");

let server, agent;
function extractCsrfToken(res) {
  var $ = cheerio.load(res.text);
  return $("name[name=_csrf]").val();
}

describe("Voting application test suite", () => {
  beforeAll(async () => {
    await db.sequelize.sync({ force: true });
    server = app.listen(5000, () => {});
    agent = request.agent(server);
  });

  afterAll(async () => {
    try {
      await db.sequelize.close();
      await server.close();
    } catch (error) {
      console.log(error);
    }
  });

  test("Signup user", async () => {
    let result = await agent.get("/signup");
    const csrfToken = extractCsrfToken(result);
    result = await agent.post("/admin").send({
      firstName: "Vineeth",
      lastName: "Dharna",
      email: "vineeth@test.com",
      password: "12345678",
      _csrf: csrfToken,
    });
    expect(result.statusCode).toBe(302);
  });

  test("Login user", async () => {
    let result = await agent.get("/login");
    expect(result.statusCode).toBe(200);
    result = await agent.get("/index");
    expect(result.statusCode).toBe(302);
  });
});
