const express = require("express");
const app = express();
const csrf = require("tiny-csrf");
const cookieParser = require("cookie-parser");
const {
  admin,
  Election,
  questions,
  Options,
  VoterRel,
  answer,
} = require("./models");
const bodyParser = require("body-parser");
const connectEnsureLogin = require("connect-ensure-login");
const LocalStratergy = require("passport-local");
const path = require("path");
const bcrypt = require("bcrypt");
const session = require("express-session");
const passport = require("passport");
// eslint-disable-next-line no-unused-vars
const { AsyncLocalStorage } = require("async_hooks");
const flash = require("connect-flash");
const saltRounds = 10;
app.use(bodyParser.json());
// eslint-disable-next-line no-undef
app.set("views", path.join(__dirname, "views"));
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: false }));
app.use(flash());
app.use(cookieParser("Some secret String"));
app.use(csrf("this_should_be_32_character_long", ["POST", "PUT", "DELETE"]));

app.use(
  session({
    secret: "my-super-secret-key-2837428907583420",
    cookie: {
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);
app.use((request, response, next) => {
  response.locals.messages = request.flash();
  next();
});
app.use(passport.initialize());
app.use(passport.session());

passport.use(
  "user-local",
  new LocalStratergy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    (username, password, done) => {
      admin
        .findOne({ where: { email: username } })
        .then(async (user) => {
          const result = await bcrypt.compare(password, user.password);
          if (result) {
            return done(null, user);
          } else {
            return done(null, false, { message: "Invalid Password!" });
          }
        })
        .catch(() => {
          return done(null, false, { message: "Invalid Email-ID!" });
        });
    }
  )
);

passport.use(
  "voter-local",
  new LocalStratergy(
    {
      usernameField: "voterid",
      passwordField: "password",
    },
    (username, password, done) => {
      VoterRel.findOne({
        where: { voterid: username },
      })
        .then(async (user) => {
          const result = await bcrypt.compare(password, user.password);
          if (result) {
            return done(null, user);
          } else {
            return done(null, false, { message: "Invalid password" });
          }
        })
        .catch(() => {
          return done(null, false, {
            message: "Invalid Voter ID",
          });
        });
    }
  )
);

app.set("view engine", "ejs");
// eslint-disable-next-line no-undef
app.use(express.static(path.join(__dirname, "public")));

passport.serializeUser((user, done) => {
  done(null, { id: user.id, case: user.case });
});
passport.deserializeUser((id, done) => {
  if (id.case === "admin") {
    admin
      .findByPk(id.id)
      .then((user) => {
        done(null, user);
      })
      .catch((error) => {
        done(error, null);
      });
  } else if (id.case === "voter") {
    VoterRel.findByPk(id.id)
      .then((user) => {
        done(null, user);
      })
      .catch((error) => {
        done(error, null);
      });
  }
});

app.post(
  "/session",
  passport.authenticate("user-local", {
    failureRedirect: "/login",
    failureFlash: true,
  }),
  async (request, response) => {
    return response.redirect("/electionpage");
  }
);

app.post(
  "/election/:publicurl/voter",
  passport.authenticate("voter-local", {
    failureFlash: true,
    failureRedirect: "back",
  }),
  async (request, response) => {
    return response.redirect(`/election/${request.params.publicurl}`);
  }
);

app.get("/", (request, response) => {
  if (request.user) {
    if (request.user.case === "admin") {
      return response.redirect("/electionpage");
    } else if (request.user.case === "voter") {
      request.logout((err) => {
        if (err) {
          return response.json(err);
        }
        response.redirect("/");
      });
    }
  } else {
    response.render("index", {
      title: "Welcome To Online Voting Platform",
    });
  }
});

app.get(
  "/index",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    response.render("index", {
      title: "Online Voting interface",
      csrfToken: request.csrfToken(),
    });
  }
);

app.get("/signup", (request, response) => {
  try {
    response.render("signup", {
      title: "Create admin account",
      csrfToken: request.csrfToken(),
    });
  } catch (err) {
    console.log(err);
  }
});

app.get("/signout", (request, response, next) => {
  request.logout((error) => {
    if (error) {
      return next(error);
    }
    request.flash("success", "Signout successfully!!");
    response.redirect("/");
  });
});

app.get("/login", (request, response) => {
  if (request.user) {
    return response.redirect("/electionpage");
  }
  response.render("login", {
    title: "Login to your admin account",
    csrfToken: request.csrfToken(),
  });
});

app.post("/admin", async (request, response) => {
  if (request.body.firstName.length == 0) {
    request.flash("error", "Firstname can not be empty!");
    return response.redirect("/signup");
  }
  if (request.body.email.length == 0) {
    request.flash("error", "Email can't be empty!");
    return response.redirect("/signup");
  }
  if (request.body.password.length == 0) {
    request.flash("error", "Password can't be empty!");
    return response.redirect("/signup");
  }
  if (request.body.password.length <= 5) {
    request.flash("error", "Password length should be minimum of length 6!");
    return response.redirect("/signup");
  }
  const hashedPwd = await bcrypt.hash(request.body.password, saltRounds);
  try {
    const user = await admin.create({
      firstName: request.body.firstName,
      lastName: request.body.lastName,
      email: request.body.email,
      password: hashedPwd,
    });
    request.login(user, (err) => {
      if (err) {
        console.log(err);
        response.redirect("/");
      } else {
        response.redirect("/electionpage");
      }
    });
  } catch (error) {
    console.log(error);
    request.flash("error", "User already Exist with this mail!");
    return response.redirect("/signup");
  }
});

app.get(
  "/electionpage",
  connectEnsureLogin.ensureLoggedIn(),
  async (req, res) => {
    if (req.user.case === "admin") {
      let uid = await admin.findByPk(req.user.id);
      let name = uid.dataValues.firstName;
      try {
        const listOfElections = await Election.retriveElections(req.user.id);
        if (req.accepts("html")) {
          res.render("homepage", {
            title: "Online Voting Homepage",
            uid,
            userName: name,
            listOfElections,
            noOfElections: listOfElections.length,
          });
        } else {
          return res.json({ listOfElections });
        }
      } catch (error) {
        console.log(error);
        return res.status(422).json(error);
      }
    } else if (req.user.case === "voter") {
      return res.redirect("/");
    }
  }
);

app.get(
  "/electionpage/addelection",
  connectEnsureLogin.ensureLoggedIn(),
  async (req, res) => {
    if (req.user.case === "admin") {
      return res.render("create-election", {
        title: "Create election",
        csrfToken: req.csrfToken(),
      });
    } else if (req.user.case === "voter") {
      return res.redirect("/");
    }
  }
);

app.post(
  "/electionpage",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.user.case === "admin") {
      if (request.body.electionName.length < 5) {
        request.flash(
          "error",
          "Election name should contain atleast 5 characters"
        );
        return response.redirect("/electionpage/addelection");
      }
      if (request.body.publicurl.trim().length < 3) {
        request.flash("error", "URL should contain atleast 3 characters");
        return response.redirect("/electionpage/addelection");
      }
      try {
        await Election.createElection({
          electionName: request.body.electionName,
          publicurl: request.body.publicurl.trim(),
          adminID: request.user.id,
        });
        return response.redirect("/electionpage");
      } catch (error) {
        console.log(error);
        request.flash("error", "URL is already in use, try another!");
        return response.redirect("/electionpage/addelection");
      }
    } else if (request.user.case === "voter") {
      return response.redirect("/");
    }
  }
);

app.get(
  "/electionpage/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async (req, res) => {
    if (req.user.case === "admin") {
      try {
        const ele = await Election.findByPk(req.params.id);
        const ques = await questions.retriveQuestions(req.params.id);
        const voters = await VoterRel.retriveVoters(req.params.id);
        res.render("launch-end", {
          title: "Election Page",
          id: req.params.id,
          ele,
          noOfQuestions: ques.length,
          voters,
          noOfVoters: voters.length,
          publicurl: ele.publicurl,
          electionName: ele.electionName.trim(),
          csrfToken: req.csrfToken(),
        });
      } catch (err) {
        console.log(err);
        return res.status(422).json(err);
      }
    } else if (req.user.case === "voter") {
      return res.redirect("/");
    }
  }
);

app.get(
  "/electionpage/:id/que/createque",
  connectEnsureLogin.ensureLoggedIn(),
  async (req, res) => {
    if (req.user.case === "admin") {
      res.render("create-question", {
        title: "Create Question",
        id: req.params.id,
        csrfToken: req.csrfToken(),
      });
    } else if (req.user.case === "voter") {
      return res.redirect("/");
    }
  }
);

app.post(
  "/electionpage/:id/que/createque",
  connectEnsureLogin.ensureLoggedIn(),
  async (req, res) => {
    if (req.user.case === "admin") {
      if (req.body.questionname < 3) {
        req.flash("error", "Question should contain 3 characters!");
        return res.redirect(`/electionpage/${req.params.id}/que/createque`);
      }
      try {
        const question = await questions.createQuestion({
          electionId: req.params.id,
          questionname: req.body.questionname,
          description: req.body.description,
        });
        return res.redirect(
          `/electionpage/${req.params.id}/que/${question.id}`
        );
      } catch (err) {
        console.log(err);
        return res.status(422).json(err);
      }
    } else if (req.user.case === "voter") {
      return res.redirect("/");
    }
  }
);

app.get(
  "/electionpage/:id/que",
  connectEnsureLogin.ensureLoggedIn(),
  async (req, res) => {
    if (req.user.case === "admin") {
      const ques = await questions.retriveQuestions(req.params.id);
      const election = await Election.findByPk(req.params.id);
      if (election.launched) {
        req.flash(
          "error",
          "Cannot modify questions while election is running!"
        );
        return res.redirect(`/electionpage/${req.params.id}`);
      }
      if (election.ended) {
        req.flash("error", "Cannot modify questions after election has ended!");
        return res.redirect(`/electionpage/${req.params.id}`);
      }
      if (req.accepts("html")) {
        res.render("questions-page", {
          title: election.electionName,
          id: req.params.id,
          questions: ques,
          election: election,
          csrfToken: req.csrfToken(),
        });
      } else {
        return res.json({
          ques,
        });
      }
    } else if (req.user.case === "voter") {
      return res.redirect("/");
    }
  }
);

app.get(
  "/electionpage/:id/que/:questionId",
  connectEnsureLogin.ensureLoggedIn(),
  async (req, res) => {
    if (req.user.case === "admin") {
      try {
        const question = await questions.retriveQuestion(req.params.questionId);
        const options = await Options.retriveOptions(req.params.questionId);
        if (req.accepts("html")) {
          res.render("questionpage", {
            title: question.questionname,
            description: question.description,
            id: req.params.id,
            questionId: req.params.questionId,
            electionId: req.params.electionName,
            options,
            csrfToken: req.csrfToken(),
          });
        }
      } catch (err) {
        console.log(err);
        return res.status(422).json(err);
      }
    } else if (req.user.case === "voter") {
      return res.redirect("/");
    }
  }
);

app.post(
  "/electionpage/:id/que/:questionId",
  connectEnsureLogin.ensureLoggedIn(),
  async (req, res) => {
    if (req.user.case === "admin") {
      if (!req.body.option) {
        req.flash("error", "Option can not be empty");
        return res.redirect(
          `/electionpage/${req.params.id}/que/${req.params.questionId}`
        );
      }
      try {
        await Options.createOption({
          option: req.body.option,
          questionId: req.params.questionId,
          electionId: req.params.electionId,
          id: req.params.id,
        });
        return res.redirect(
          `/electionpage/${req.params.id}/que/${req.params.questionId}`
        );
      } catch (err) {
        console.log(err);
        return res.status(422).json(err);
      }
    } else if (req.user.case === "voter") {
      return res.redirect("/");
    }
  }
);

app.delete(
  "/electionpage/:electionId/que/:questionId/opt/:optionId",
  connectEnsureLogin.ensureLoggedIn(),
  async (req, res) => {
    if (req.user.case === "admin") {
      try {
        const result = Options.deleteOption(req.params.optionId);
        return res.json({ success: result === 1 });
      } catch (err) {
        console.log(err);
        return res.status(422).json(err);
      }
    } else if (req.user.case === "voter") {
      return res.redirect("/");
    }
  }
);

app.get(
  "/electionpage/:electionId/que/:questionId/opt/:optionId/edit",
  connectEnsureLogin.ensureLoggedIn(),
  async (req, res) => {
    if (req.user.case === "admin") {
      try {
        const option = await Options.retriveOptions(req.params.optionId);
        return res.render("edit-option", {
          option: option.option,
          csrfToken: req.csrfToken(),
          electionId: req.params.electionId,
          questionId: req.params.questionId,
          optionId: req.params.optionId,
        });
      } catch (err) {
        console.log(err);
        return res.status(422).json(err);
      }
    } else if (req.user.case === "voter") {
      return res.redirect("/");
    }
  }
);

app.put(
  "/electionpage/:electionId/que/:questionId/opt/:optionId/edit",
  connectEnsureLogin.ensureLoggedIn(),
  async (req, res) => {
    if (req.user.case === "admin") {
      if (!req.body.option) {
        req.flash("error", "Enter option");
        return res.json({
          error: "Enter option",
        });
      }
      try {
        const newOption = await Options.editOption({
          option: req.body.option,
          id: req.params.optionId,
        });
        return res.json(newOption);
      } catch (err) {
        console.log(err);
        return res.status(422).json(err);
      }
    } else if (req.user.case === "voter") {
      return res.redirect("/");
    }
  }
);

app.get(
  "/electionpage/:electionId/que/:questionId/edit",
  connectEnsureLogin.ensureLoggedIn(),
  async (req, res) => {
    if (req.user.case === "admin") {
      try {
        const question = await questions.retriveQuestion(req.params.questionId);
        return res.render("edit-question", {
          electionId: req.params.electionId,
          questionId: req.params.questionId,
          questionName: question.questionname,
          description: question.description,
          id: req.params.id,
          csrfToken: req.csrfToken(),
        });
      } catch (err) {
        console.log(err);
        return res.status(422).json(err);
      }
    } else if (req.user.case === "voter") {
      return res.redirect("/");
    }
  }
);

app.put(
  "/electionpage/:electionId/que/:questionId/edit",
  connectEnsureLogin.ensureLoggedIn(),
  async (req, res) => {
    if (req.user.case === "admin") {
      if (req.body.question.length < 5) {
        req.flash("error", "Question length should be atleast 5");
        return res.json({
          error: "Question length should be atleast 5",
        });
      }
      try {
        const newQuestion = await questions.editQuestion({
          questionname: req.body.question,
          description: req.body.description,
          id: req.params.questionId,
        });
        return res.json(newQuestion);
      } catch (error) {
        console.log(error);
        return res.status(422).json(error);
      }
    } else if (req.user.case === "voter") {
      return res.redirect("/");
    }
  }
);

app.delete(
  "/deletequestion/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async (req, res) => {
    if (req.user.case === "admin") {
      try {
        const result = await questions.removeQuestion(req.params.id);
        return res.json({ success: result === 1 });
      } catch (err) {
        console.log(err);
        return res.status(422).json(err);
      }
    } else if (req.user.case === "voter") {
      return res.redirect("/");
    }
  }
);

app.get(
  "/electionpage/:electionId/voters",
  connectEnsureLogin.ensureLoggedIn(),
  async (req, res) => {
    if (req.user.case === "admin") {
      try {
        const election = await Election.retriveElection(req.params.electionId);
        const voters = await VoterRel.retriveVoters(req.params.electionId);
        if (election.ended) {
          req.flash("error", "Cannot modify voters after election has ended!");
          return res.redirect(`/electionpage/${req.params.electionId}`);
        }
        if (req.accepts("html")) {
          return res.render("voters-manage", {
            title: election.electionName,
            id: req.params.electionId,
            csrfToken: req.csrfToken(),
            voters,
            election,
          });
        } else {
          return res.json({ voters });
        }
      } catch (err) {
        console.log(err);
        return res.status(422).json(err);
      }
    } else if (req.user.case === "voter") {
      return res.redirect("/");
    }
  }
);

app.get(
  "/electionpage/:electionId/voters/votercreate",
  connectEnsureLogin.ensureLoggedIn(),
  async (req, res) => {
    if (req.user.case === "admin") {
      try {
        res.render("create-voter", {
          title: "Add voter",
          electionId: req.params.electionId,
          csrfToken: req.csrfToken(),
        });
      } catch (err) {
        console.log(err);
        return res.status(422).json(err);
      }
    } else if (req.user.case === "voter") {
      return res.redirect("/");
    }
  }
);

app.post(
  "/electionpage/:electionId/voters/votercreate",
  connectEnsureLogin.ensureLoggedIn(),
  async (req, res) => {
    if (req.user.case === "admin") {
      if (req.body.password.length < 8) {
        req.flash("error", "Password should contain atleast 8 characters");
        return res.redirect(
          `/electionpage/${req.params.electionId}/voters/votercreate`
        );
      }
      const hashedPwd = await bcrypt.hash(req.body.password, saltRounds);
      try {
        await VoterRel.addVoter({
          voterid: req.body.voterid,
          electionId: req.params.electionId,
          password: hashedPwd,
        });
        return res.redirect(`/electionpage/${req.params.electionId}/voters`);
      } catch (err) {
        console.log(err);
        req.flash("error", "Voter ID already in use, try another!");
        return res.redirect(
          `/electionpage/${req.params.electionId}/voters/votercreate`
        );
      }
    } else if (req.user.case === "voter") {
      return res.redirect("/");
    }
  }
);

app.delete(
  "/:id/:electionId",
  connectEnsureLogin.ensureLoggedIn(),
  async (req, res) => {
    if (req.user.case === "admin") {
      try {
        const result = await VoterRel.removeVoter(req.params.id);
        return res.json({ success: result === 1 });
      } catch (err) {
        console.log(err);
        return res.status(422).json(err);
      }
    } else if (req.user.case === "voter") {
      return res.redirect("/");
    }
  }
);

app.get(
  "/:electionId/:voterID/edit",
  connectEnsureLogin.ensureLoggedIn(),
  async (req, res) => {
    if (req.user.case === "admin") {
      const election = await Election.findByPk(req.params.electionId);
      const voter = await VoterRel.retriveVoter(req.params.electionId);
      res.render("edit-voter-password", {
        title: "Edit Voter Password",
        electionId: req.params.electionId,
        voter: voter,
        election: election,
        csrfToken: req.csrfToken(),
      });
    } else if (req.user.case === "voter") {
      return res.redirect("/");
    }
  }
);

app.post(
  "/:electionId/:voterID/edit",
  connectEnsureLogin.ensureLoggedIn(),
  async (req, res) => {
    if (req.user.case === "admin") {
      try {
        await VoterRel.editPassword(req.params.voterID, req.body.password);
        res.redirect(`/electionpage/${req.params.electionId}/voters`);
      } catch (err) {
        console.log(err);
        return;
      }
    } else if (req.user.case === "voter") {
      return res.redirect("/");
    }
  }
);

app.get(
  "/:id/previewelection",
  connectEnsureLogin.ensureLoggedIn(),
  async (req, res) => {
    if (req.user.case === "admin") {
      const election = await Election.retriveElection(req.params.id);
      const question = await questions.retriveQuestions(req.params.id);
      const opt = [];
      const quelength = question.length;
      const voter = await VoterRel.retriveVoters(req.params.id);
      for (let i = 0; i < quelength; i++) {
        const list = await Options.retriveOptions(question[i].id);
        opt.push(list);
      }
      res.render("preview-election", {
        title: "Election Preview",
        election: election,
        questions: question,
        options: opt,
        quelength,
        voter,
        voterlength: voter.length,
        id: req.params.id,
        csrfToken: req.csrfToken(),
      });
    } else if (req.user.case === "voter") {
      return res.redirect("/");
    }
  }
);

app.get(
  "/:id/previewresult",
  connectEnsureLogin.ensureLoggedIn(),
  async (req, res) => {
    if (req.user.case === "admin") {
      try {
        const election = await Election.retriveElection(req.params.id);
        const Questions = await questions.retriveQuestions(election.id);
        const answers = await answer.retriveAnswers(election.id);
        let winners = [];
        let options = [];
        let optionLabels = [];
        let optionsCount = [];
        for (let question in Questions) {
          let opts = await Options.retriveOptions(Questions[question].id);
          options.push(opts);
          let opts_count = [];
          let opts_labels = [];
          for (let opt in opts) {
            opts_labels.push(opts[opt].option);
            opts_count.push(
              await answer.retriveOptionCount({
                electionId: election.id,
                choosenOption: opts[opt].id,
                questionId: Questions[question].id,
              })
            );
          }
          winners.push(Math.max.apply(Math, opts_count));
          optionLabels.push(opts_labels);
          optionsCount.push(opts_count);
        }
        const voted = await VoterRel.totalVoted(election.id);
        const notvoted = await VoterRel.totalNotVoted(election.id);
        return res.render("preview-result", {
          election,
          electionName: election.electionName,
          answers,
          Questions,
          winners,
          options,
          optionsCount,
          id: req.params.electionId,
          optionLabels,
          voted,
          notvoted,
          totalVoters: voted + notvoted,
        });
      } catch (err) {
        console.log(err);
        return res.status(422).json(err);
      }
    } else if (req.user.case === "voter") {
      return res.redirect("/");
    }
  }
);

app.get(
  "/:id/launch",
  connectEnsureLogin.ensureLoggedIn(),
  async (req, res) => {
    if (req.user.case === "admin") {
      const voter = await VoterRel.retriveVoters(req.params.id);
      const que = await questions.findAll({
        where: { electionId: req.params.id },
      });
      if (que.length < 1) {
        req.flash("error", "Add atleast one question to launch election!");
        return res.redirect(`/electionpage/${req.params.id}`);
      }
      for (let i = 0; i < que.length; i++) {
        const opt = await Options.retriveOptions(que[i].id);
        if (opt.length <= 1) {
          req.flash(
            "error",
            "Add atleast two options to the questions before launch!"
          );
          return res.redirect(`/electionpage/${req.params.id}`);
        }
      }
      if (voter.length <= 1) {
        req.flash("error", "Add atleast two voters to lauch election");
        return res.redirect(`/electionpage/${req.params.id}`);
      }
      try {
        await Election.launchElection(req.params.id);
        return res.redirect(`/electionpage/${req.params.id}`);
      } catch (error) {
        console.log(error);
        return res.send(error);
      }
    } else if (req.user.case === "voter") {
      return res.redirect("/");
    }
  }
);

app.get("/election/:publicurl/voter", async (req, res) => {
  try {
    const election = await Election.retriveUrl(req.params.publicurl);
    if (election.ended) {
      return res.redirect(`/election/${election.publicurl}/results`);
    }
    return res.render("voter-login", {
      title: "Voter Login",
      publicurl: req.params.publicurl,
      electionId: election.id,
      csrfToken: req.csrfToken(),
    });
  } catch (error) {
    console.log(error);
    return res.status(422).json(error);
  }
});

app.get("/election/:publicurl", async (req, res) => {
  try {
    const election = await Election.retriveUrl(req.params.publicurl);
    if (election.ended) {
      return res.redirect(`/election/${election.publicurl}/results`);
    }
    if (req.user.case === "voter") {
      if (req.user.voted) {
        return res.redirect(`/election/${election.publicurl}/results`);
      }
      const Questions = await questions.retriveQuestions(election.id);
      let options = [];
      for (let question in Questions) {
        options.push(await Options.retriveOptions(Questions[question].id));
      }
      if (req.accepts("html")) {
        return res.render("voter-response", {
          title: election.electionName,
          electionId: election.id,
          Questions,
          options,
          publicurl: req.params.publicurl,
          csrfToken: req.csrfToken(),
        });
      } else {
        return res.json({
          Questions,
          options,
        });
      }
    } else if (req.user.case === "admin") {
      req.logout(() => {});
      req.flash("error", "Signed out as Admin");
      return res.redirect(`/election/${req.params.public}/voter`);
    }
  } catch (error) {
    console.log(error);
    return res.status(422).json(error);
  }
});

app.post("/election/:publicurl", async (req, res) => {
  try {
    const election = await Election.retriveUrl(req.params.publicurl);
    if (election.ended) {
      req.flash("error", "Election has ended, can't vote!");
      return res.redirect(`/election/${req.params.public}/results`);
    }
    if (req.user.case === "voter") {
      if (req.user.voted) {
        return res.redirect(`/election/${election.publicurl}/results`);
      }
      let Questions = await questions.retriveQuestions(election.id);
      for (let que of Questions) {
        let qid = `q-${que.id}`;
        let choosenOption = req.body[qid];
        await answer.addAnswer({
          voterId: req.user.id,
          electionId: election.id,
          questionId: que.id,
          choosenOption: choosenOption,
        });
      }
      await VoterRel.voted(req.user.id);
      req.flash("error", "Voted successfully!");
      return res.redirect(`/election/${req.params.publicurl}/results`);
    } else if (req.user.case === "admin") {
      req.logout(() => {});
      req.flash("error", "Signed out as Admin");
      return res.redirect(`/election/${req.params.public}/voter`);
    }
  } catch (error) {
    console.log(error);
    return res.status(422).json(error);
  }
});

app.get("/election/:publicurl/results", async (req, res) => {
  try {
    const election = await Election.retriveUrl(req.params.publicurl);
    if (!election.ended) {
      return res.render("endpage");
    }
    const Questions = await questions.retriveQuestions(election.id);
    const answers = await answer.retriveAnswers(election.id);
    let winners = [];
    let options = [];
    let optionLabels = [];
    let optionsCount = [];
    for (let question in Questions) {
      let opts = await Options.retriveOptions(Questions[question].id);
      options.push(opts);
      let opts_count = [];
      let opts_labels = [];
      for (let opt in opts) {
        opts_labels.push(opts[opt].option);
        opts_count.push(
          await answer.retriveOptionCount({
            electionId: election.id,
            choosenOption: opts[opt].id,
            questionId: Questions[question].id,
          })
        );
      }
      winners.push(Math.max.apply(Math, opts_count));
      optionLabels.push(opts_labels);
      optionsCount.push(opts_count);
    }
    return res.render("results", {
      election,
      electionName: election.electionName,
      answers,
      Questions,
      winners,
      options,
      optionsCount,
      optionLabels,
    });
  } catch (err) {
    console.log(err);
    return res.status(422).json(err);
  }
});

app.get("/:id/end", connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
  if (req.user.case === "admin") {
    try {
      await Election.endElection(req.params.id);
      return res.redirect(`/electionpage/${req.params.id}`);
    } catch (err) {
      console.log(err);
      return res.send(err);
    }
  } else if (req.user.case === "voter") {
    return res.redirect("/");
  }
});

app.get("/reset", connectEnsureLogin.ensureLoggedIn(), (req, res) => {
  if (req.user.case === "admin") {
    res.render("edit-admin-password", {
      title: "Reset password",
      csrfToken: req.csrfToken(),
    });
  } else if (req.user.case === "voter") {
    return res.redirect("/");
  }
});

app.post("/reset", connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
  if (req.user.case === "admin") {
    if (req.body.newPassword.length < 8) {
      req.flash("error", "Password length should be atleast 8");
      return res.redirect("/reset");
    }
    const hashedNewPwd = await bcrypt.hash(req.body.newPassword, saltRounds);
    if (await bcrypt.compare(req.body.oldPassword, req.user.password)) {
      try {
        admin.findOne({ where: { email: req.user.email } }).then((user) => {
          user.resetPassword(hashedNewPwd);
        });
        req.flash("success", "Password changed successfully");
        return res.redirect("/electionpage");
      } catch (error) {
        console.log(error);
        return res.status(422).json(error);
      }
    } else {
      req.flash("error", "Old password does not match");
      return res.redirect("/reset");
    }
  } else if (req.user.case === "voter") {
    return res.redirect("/");
  }
});

module.exports = app;
