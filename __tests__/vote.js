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
    server = app.listen(9000, () => {});
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

  test("Signup new user", async () => {
    res = await agent.get("/signup");
    const csrfToken = extractCsrfToken(res);
    res = await agent.post("/admin").send({
      firstName: "Vineeth",
      lastName: "Dharna",
      email: "vineeth@test.com",
      password: "123456789",
      _csrf: csrfToken,
    });
    expect(res.statusCode).toBe(302);
  });

  test("User login", async () => {
    res = await agent.get("/electionpage");
    expect(res.statusCode).toBe(200);
    await login(agent, "vineeth@test.com", "123456789");
    res = await agent.get("/electionpage");
    expect(res.statusCode).toBe(200);
  });

  test("User signout", async () => {
    let res = await agent.get("/electionpage");
    expect(res.statusCode).toBe(200);
    res = await agent.get("/signout");
    expect(res.statusCode).toBe(302);
    res = await agent.get("/electionpage");
    expect(res.statusCode).toBe(302);
  });

  test("Creating election", async () => {
    const agent = request.agent(server);
    await login(agent, "vineeth@test.com", "123456789");
    const res = await agent.get("/electionpage/addelection");
    const csrfToken = extractCsrfToken(res);
    const response = await agent.post("/electionpage").send({
      electionName: "election",
      publicurl: "election",
      _csrf: csrfToken,
    });
    expect(response.statusCode).toBe(302);
  });

  test("Adding question", async () => {
    const agent = request.agent(server);
    await login(agent, "vineeth@test.com", "123456789");
    let res = await agent.get("/electionpage/addelection");
    let csrfToken = extractCsrfToken(res);
    await agent.post("/electionpage").send({
      electionName: "election",
      publicurl: "election",
      _csrf: csrfToken,
    });
    const groupedElectionsResponse = await agent
      .get("/electionpage")
      .set("Accept", "application/json");
    const parsedGroupedResponse = JSON.parse(groupedElectionsResponse.text);
    const noOfElections = parsedGroupedResponse.listOfElections.length;
    const newElection =
      parsedGroupedResponse.listOfElections[noOfElections - 1];
    res = await agent.get(`/electionpage/${newElection.id}/que/createque`);
    csrfToken = extractCsrfToken(res);
    let response = await agent
      .post(`/electionpage/${newElection.id}/que/createque`)
      .send({
        questionname: "election",
        description: "election",
        _csrf: csrfToken,
      });
    expect(response.statusCode).toBe(302);
  });

  test("Deleting question", async () => {
    const agent = request.agent(server);
    await login(agent, "vineeth@test.com", "123456789");
    let res = await agent.get("/electionpage/addelection");
    let csrfToken = extractCsrfToken(res);
    await agent.post("/electionpage").send({
      electionName: "election",
      publicurl: "election",
      _csrf: csrfToken,
    });
    const groupedElectionsResponse = await agent
      .get("/electionpage")
      .set("Accept", "application/json");
    const parsedGroupedElectionsResponse = JSON.parse(
      groupedElectionsResponse.text
    );
    const noOfElections = parsedGroupedElectionsResponse.listOfElections.length;
    const newElection =
      parsedGroupedElectionsResponse.listOfElections[noOfElections - 1];
    res = await agent.get(`/electionpage/${newElection.id}/que/createque`);
    csrfToken = extractCsrfToken(res);
    await agent.post(`/electionpage/${newElection.id}/que/createque`).send({
      questionname: "question",
      description: "description",
      _csrf: csrfToken,
    });
    res = await agent.get(`/electionpage/${newElection.id}/que/createque`);
    csrfToken = extractCsrfToken(res);
    await agent.post(`/electionpage/${newElection.id}/que/createque`).send({
      question: "update question",
      description: "update description",
      _csrf: csrfToken,
    });
    const groupedQuestionsResponse = await agent
      .get(`/electionpage/${newElection.id}/que`)
      .set("Accept", "application/json");
    const parsedQuestionsGroupedResponse = JSON.parse(
      groupedQuestionsResponse.text
    );
    const questionCount = parsedQuestionsGroupedResponse.ques.length;
    const latestQuestion =
      parsedQuestionsGroupedResponse.ques[questionCount - 1];
    res = await agent.get(`/electionpage/${newElection.id}/que`);
    csrfToken = extractCsrfToken(res);
    const deleteResponse = await agent
      .delete(`/deletequestion/${latestQuestion.id}`)
      .send({
        _csrf: csrfToken,
      });
    const parsedDeleteResponse = JSON.parse(deleteResponse.text).success;
    expect(parsedDeleteResponse).toBe(true);
    res = await agent.get(`/electionpage/${newElection.id}/que`);
    csrfToken = extractCsrfToken(res);
    const deleteResponse2 = await agent
      .delete(`/deletequestion/${latestQuestion.id}`)
      .send({
        _csrf: csrfToken,
      });
    const parsedDeleteResponse2 = JSON.parse(deleteResponse2.text).success;
    expect(parsedDeleteResponse2).toBe(false);
  });

  test("Updating question", async () => {
    const agent = request.agent(server);
    await login(agent, "vineeth@test.com", "123456789");
    let res = await agent.get("/electionpage/addelection");
    let csrfToken = extractCsrfToken(res);
    await agent.post("/electionpage").send({
      electionName: "test election",
      publicurl: "test url",
      _csrf: csrfToken,
    });
    const groupedElectionsResponse = await agent
      .get("/electionpage")
      .set("Accept", "application/json");
    const parsedGroupedElectionsResponse = JSON.parse(
      groupedElectionsResponse.text
    );
    const noOfElections = parsedGroupedElectionsResponse.listOfElections.length;
    const newElection =
      parsedGroupedElectionsResponse.listOfElections[noOfElections - 1];
    res = await agent.get(`/electionpage/${newElection.id}/que/createque`);
    csrfToken = extractCsrfToken(res);
    await agent.post(`/electionpage/${newElection.id}/que/createque`).send({
      questionname: "test question ",
      description: "test description ",
      _csrf: csrfToken,
    });
    const groupedQuestionsResponse = await agent
      .get(`/electionpage/${newElection.id}/que`)
      .set("Accept", "application/json");
    const parsedQuestionsGroupedResponse = JSON.parse(
      groupedQuestionsResponse.text
    );
    const noOfQuestions = parsedQuestionsGroupedResponse.ques.length;
    const latestQuestion =
      parsedQuestionsGroupedResponse.ques[noOfQuestions - 1];
    res = await agent.get(
      `/electionpage/${newElection.id}/que/${latestQuestion.id}/edit`
    );
    csrfToken = extractCsrfToken(res);
    res = await agent
      .put(`/electionpage/${newElection.id}/que/${latestQuestion.id}/edit`)
      .send({
        _csrf: csrfToken,
        question: "updated question",
        description: "updated description",
      });
    expect(res.statusCode).toBe(200);
  });

  test("Adding option", async () => {
    const agent = request.agent(server);
    await login(agent, "vineeth@test.com", "123456789");
    let res = await agent.get("/electionpage/addelection");
    let csrfToken = extractCsrfToken(res);
    await agent.post("/electionpage").send({
      electionName: "election",
      publicurl: "election",
      _csrf: csrfToken,
    });
    const groupedElectionsResponse = await agent
      .get("/electionpage")
      .set("Accept", "application/json");
    const parsedGroupedResponse = JSON.parse(groupedElectionsResponse.text);
    const noOfElections = parsedGroupedResponse.listOfElections.length;
    const newElection =
      parsedGroupedResponse.listOfElections[noOfElections - 1];
    res = await agent.get(`/electionpage/${newElection.id}/que/createque`);
    csrfToken = extractCsrfToken(res);
    await agent.post(`/electionpage/${newElection.id}/que/createque`).send({
      questionname: "question",
      description: "description",
      _csrf: csrfToken,
    });
    const groupedQuestionsResponse = await agent
      .get(`/electionpage/${newElection.id}/que`)
      .set("Accept", "application/json");
    const parsedQuestionsGroupedResponse = JSON.parse(
      groupedQuestionsResponse.text
    );
    const questionCount = parsedQuestionsGroupedResponse.ques.length;
    const latestQuestion =
      parsedQuestionsGroupedResponse.ques[questionCount - 1];
    res = await agent.get(
      `/electionpage/${newElection.id}/que/${latestQuestion.id}`
    );
    csrfToken = extractCsrfToken(res);
    res = await agent
      .post(`/electionpage/${newElection.id}/que/${latestQuestion.id}`)
      .send({
        _csrf: csrfToken,
        option: "Test option",
      });
    expect(res.statusCode).toBe(302);
  });
});
