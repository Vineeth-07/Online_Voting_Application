/* eslint-disable no-undef */
const request = require("supertest");
const cheerio = require("cheerio");
const db = require("../models/index");
const app = require("../app");
// eslint-disable-next-line no-unused-vars
const { response } = require("../app");

let server, agent;

function extractCsrfToken(res) {
  var $ = cheerio.load(res.text);
  return $("[name=_csrf]").val();
}

const login = async (agent, username, password) => {
  let res = await agent.get("/login");
  let csrfToken = extractCsrfToken(res);
  res = await agent.post("/session").send({
    email: username,
    password: password,
    _csrf: csrfToken,
  });
};

describe("Voting application test suite", function () {
  beforeAll(async () => {
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
    res = await agent.get("/signup");
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
    let res = await agent.get("/elections");
    expect(res.statusCode).toBe(200);
    res = await agent.get("/signout");
    expect(res.statusCode).toBe(302);
    res = await agent.get("/elections");
    expect(res.statusCode).toBe(302);
  });

  test("Creating  election", async () => {
    const agent = request.agent(server);
    await login(agent, "vineeth@test.com", "12345678");
    const res = await agent.get("/create");
    const csrfToken = extractCsrfToken(res);
    const response = await agent.post("/elections").send({
      electionName: "vineeth",
      publicurl: "urll",
      _csrf: csrfToken,
    });
    expect(response.statusCode).toBe(302);
  });

  test("Adding  question", async () => {
    const agent = request.agent(server);
    await login(agent, "vineeth@test.com", "12345678");

    let res = await agent.get("/create");
    let csrfToken = extractCsrfToken(res);
    await agent.post("/elections").send({
      electionName: "Class CR",
      publicurl: "url2",
      _csrf: csrfToken,
    });
    const groupedResponse = await agent
      .get("/elections")
      .set("Accept", "Application/json");
    const parsedResponse = JSON.parse(groupedResponse.text);
    console.log(parsedResponse);
    const electionCount = parsedResponse.elections_list.length;
    const latestElection = parsedResponse.elections_list[electionCount - 1];

    res = await agent.get(`/questionscreate/${latestElection.id}`);
    csrfToken = extractCsrfToken(res);
    res = await agent.post(`/questionscreate/${latestElection.id}`).send({
      questionname: "Class GR",
      description: "Vote",
      _csrf: csrfToken,
    });
    expect(res.statusCode).toBe(302);
  });

  test("Deleting question", async () => {
    const agent = request.agent(server);
    await login(agent, "vineeth@test.com", "12345678");

    let res = await agent.get("/create");
    let csrfToken = extractCsrfToken(res);
    await agent.post("/elections").send({
      electionName: "Games",
      publicurl: "url3",
      _csrf: csrfToken,
    });
    const ElectionsResponse = await agent
      .get("/elections")
      .set("Accept", "Application/json");
    const parsedResponse = JSON.parse(ElectionsResponse.text);
    const electionCount = parsedResponse.elections_list.length;
    const latestElection = parsedResponse.elections_list[electionCount - 1];

    res = await agent.get(`/questionscreate/${latestElection.id}`);
    csrfToken = extractCsrfToken(res);
    await agent.post(`/questionscreate/${latestElection.id}`).send({
      questionname: "Monitoring",
      description: "Boys",
      _csrf: csrfToken,
    });

    res = await agent.get(`/questionscreate/${latestElection.id}`);
    csrfToken = extractCsrfToken(res);
    await agent.post(`/questionscreate/${latestElection.id}`).send({
      question: "Best",
      description: "Fit",
      _csrf: csrfToken,
    });

    const groupedResponse = await agent
      .get(`/questions/${latestElection.id}`)
      .set("Accept", "application/json");
    const parsedquestionsGroupedResponse = JSON.parse(groupedResponse.text);
    const questionCount = parsedquestionsGroupedResponse.questions1.length;
    const latestQuestion =
      parsedquestionsGroupedResponse.questions1[questionCount - 1];

    res = await agent.get(`/questions/${latestElection.id}`);
    csrfToken = extractCsrfToken(res);
    const deleteResponse = await agent
      .delete(`/deletequestion/${latestQuestion.id}`)
      .send({
        _csrf: csrfToken,
      });
    console.log(deleteResponse.text);
    const parsedDeleteResponse = JSON.parse(deleteResponse.text);
    expect(parsedDeleteResponse.success).toBe(true);

    res = await agent.get(`/questions/${latestQuestion.id}`);
    csrfToken = extractCsrfToken(res);

    const deleteResponse2 = await agent
      .delete(`/deletequestion/${latestElection.id}`)
      .send({
        _csrf: csrfToken,
      });
    const parsedDeleteResponse2 = JSON.parse(deleteResponse2.text).success;
    expect(parsedDeleteResponse2).toBe(false);
  });
});
