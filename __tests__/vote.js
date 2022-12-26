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

  test("Sign up user", async () => {
    let res = await agent.get("/signup");
    const csrfToken = extractCsrfToken(res);
    res = await agent.post("/admin").send({
      firstName: "Vineeth",
      lastName: "Dharna",
      email: "vineeth@test.com",
      password: "12345678",
      _csrf: csrfToken,
    });
    expect(res.statusCode).toBe(302);
  });

  test("Login user", async () => {
    let res = await agent.get("/login");
    expect(res.statusCode).toBe(200);
    res = await agent.get("/index");
    expect(res.statusCode).toBe(302);
  });

  test("Signout user", async () => {
    let res = await agent.get("/election");
    expect(res.statusCode).toBe(200);
    res = await agent.get("/signout");
    expect(res.statusCode).toBe(302);
    res = await agent.get("/election");
    expect(res.statusCode).toBe(302);
  });

  // test("Create election", async () => {
  //   const agent = request.agent(server);
  //   await login(agent, "vineeth@test.com", "12345678");
  //   const res = await agent.get("/create");
  //   const csrfToken = extractCsrfToken(res);
  //   const response = await agent.post("/election").send({
  //     electionName: "Class CR",
  //     publicurl: "test",
  //     _csrf: csrfToken,
  //   });
  //   expect(response.statusCode).toBe(302);
  // });
});
