const express = require("express");
var csrf = require("tiny-csrf");
const app = express();
const bodyParser = require("body-parser");
var cookieParser = require("cookie-parser");
const { Admin, Election, questions, options } = require("./models");
const path = require("path");
const passport = require("passport");
const connectEnsureLogin = require("connect-ensure-login");
const session = require("express-session");
const LocalStrategy = require("passport-local");
const bcrypt = require("bcrypt");
const flash = require("connect-flash");
app.use(bodyParser.json());

const saltRounds = 10;

app.use(express.urlencoded({ extended: false }));
app.use(cookieParser("shh! some secret string"));
app.use(csrf("this_should_be_32_character_long", ["POST", "PUT", "DELETE"]));

app.set("view engine", "ejs");
// eslint-disable-next-line no-undef
app.use(express.static(path.join(__dirname, "public")));
// eslint-disable-next-line no-undef
app.set("views", path.join(__dirname, "views"));
app.use(flash());
app.use(cookieParser("Some secret String"));
app.use(
  session({
    secret: "my-super-secret-key-21728172615261562",
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, //24hours
    },
  })
);
app.use(function (request, response, next) {
  response.locals.messages = request.flash();
  next();
});
app.use(passport.initialize());
app.use(passport.session());

passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    (username, password, done) => {
      Admin.findOne({ where: { email: username } })
        .then(async function (user) {
          const result = await bcrypt.compare(password, user.password);
          if (result) {
            return done(null, user);
          } else {
            return done(null, false, { message: "Invalid password" });
          }
        })
        .catch(() => {
          return done(null, false, {
            message: "Account doesn't exist for this mail",
          });
        });
    }
  )
);

passport.serializeUser((user, done) => {
  console.log("Serializing user in session", user.id);
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  Admin.findByPk(id)
    .then((user) => {
      done(null, user);
    })
    .catch((error) => {
      done(error, null);
    });
});

app.get("/", (request, response) => {
  response.render("index", {
    title: "Voting Application",
    csrf: request.csrfToken(),
  });
});

app.get("/signup", (request, response) => {
  try {
    response.render("signup", {
      title: "Signup",
      csrfToken: request.csrfToken(),
    });
  } catch (error) {
    console.log(error);
    return response.redirect("/signup");
  }
});

app.post("/admin", async (request, response) => {
  if (request.body.email.length == 0) {
    request.flash("error", "Email can not be empty!");
    return response.redirect("/signup");
  }

  if (request.body.firstName.length == 0) {
    request.flash("error", "First name can not be empty!");
    return response.redirect("/signup");
  }
  if (request.body.password.length < 8) {
    request.flash("error", "Password length should be minimun 8");
    return response.redirect("/signup");
  }
  const hashedPwd = await bcrypt.hash(request.body.password, saltRounds);
  console.log(hashedPwd);

  try {
    const user = await Admin.create({
      firstName: request.body.firstName,
      lastName: request.body.lastName,
      email: request.body.email,
      password: hashedPwd,
    });
    request.login(user, (err) => {
      if (err) {
        console.log(err);
        response.redirect("/");
      }
      response.redirect("/election");
    });
  } catch (error) {
    console.log(error);
    return response.redirect("/signup");
  }
});

app.get(
  "/election",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    const loggedInUser = request.user.id;
    const listofelections = await Election.getElections(request.user.id);
    const user = await Admin.findByPk(loggedInUser);
    const userName = user.dataValues.firstName;
    if (request.accepts("html")) {
      response.render("election", {
        title: "Elections page",
        userName,
        listofelections,
        csrfToken: request.csrfToken(),
      });
    } else {
      response.json({ userName, listofelections });
    }
  }
);

app.get("/login", (request, response) => {
  try {
    response.render("login", {
      title: "Login",
      csrfToken: request.csrfToken(),
    });
  } catch (error) {
    console.log(error);
    return response.redirect("/login");
  }
});

app.post(
  "/session",
  passport.authenticate("local", {
    failureRedirect: "/login",
    failureFlash: true,
  }),
  function (request, response) {
    console.log(request.user);
    response.redirect("/election");
  }
);

app.get("/signout", (request, response, next) => {
  request.logout((error) => {
    if (error) {
      return next(error);
    }
    response.redirect("/");
  });
});

app.get(
  "/create",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    response.render("newelection", {
      title: "Create election",
      csrfToken: request.csrfToken(),
    });
  }
);

app.post(
  "/election",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    try {
      await Election.addElections({
        electionName: request.body.electionName,
        publicurl: request.body.publicurl,
        adminID: request.user.id,
      });
      return response.redirect("/election");
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  }
);

app.get(
  "/electionslist/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    try {
      //const voter = await Voters.retrivevoters(request.params.id);
      const question = await questions.retrievequestion(request.params.id);
      const election = await Election.findByPk(request.params.id);
      // eslint-disable-next-line no-unused-vars
      const electionname = await Election.getElections(
        request.params.id,
        request.user.id
      );
      const countofquestions = await questions.countquestions(
        request.params.id
      );
      //const countofvoters = await Voters.countvoters(request.params.id);
      response.render("electionquestion", {
        election: election,
        publicurl: election.publicurl,
        //voters: voter,
        questions: question,
        id: request.params.id,
        title: election.electionName,
        countquestions: countofquestions,
        // countvoters: countofvoters,
      });
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  }
);

app.get(
  "/question/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    // eslint-disable-next-line no-unused-vars
    const electionlist = await Election.getElections(
      request.params.id,
      request.user.id
    );
    const questions1 = await questions.retrievequestions(request.params.id);
    const election = await Election.findByPk(request.params.id);
    if (election.launched) {
      request.flash(
        "error",
        "Can not modify question while election is running!!"
      );
      return response.redirect(`/electionslist/${request.params.id}`);
    }
    if (request.accepts("html")) {
      response.render("question", {
        title: election.electionName,
        id: request.params.id,
        questions: questions1,
        election: election,
        csrfToken: request.csrfToken(),
      });
    } else {
      return response.json({
        questions1,
      });
    }
  }
);

app.get(
  "/questionscreate/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    response.render("questioncreate", {
      id: request.params.id,
      csrfToken: request.csrfToken(),
    });
  }
);

app.post(
  "/questionscreate/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (!request.body.questionname) {
      request.flash("error", "Question can not be empty!!");
      return response.redirect(`/questionscreate/${request.params.id}`);
    }
    try {
      const question = await questions.addquestion({
        electionID: request.params.id,
        questionname: request.body.questionname,
        description: request.body.description,
      });
      return response.redirect(
        `/displayelections/correspondingquestion/${request.params.id}/${question.id}/options`
      );
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  }
);

app.get(
  "/displayelections/correspondingquestion/:id/:questionID/options",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    try {
      const question = await questions.retrievequestion(
        request.params.questionID
      );
      const option = await options.retrieveoptions(request.params.questionID);
      if (request.accepts("html")) {
        response.render("addoptions", {
          title: question.questionname,
          description: question.description,
          id: request.params.id,
          questionID: request.params.questionID,
          option,
          csrfToken: request.csrfToken(),
        });
      } else {
        return response.json({
          option,
        });
      }
    } catch (err) {
      return response.status(422).json(err);
    }
  }
);

app.delete(
  "/deletequestion/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    try {
      const res = await questions.removequestion(request.params.id);
      return response.json({ success: res === 1 });
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  }
);

app.post(
  "/displayelections/correspondingquestion/:id/:questionID/options",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (!request.body.optionname) {
      request.flash("error", "Option can not be empty");
      return response.redirect(
        `/displayelections/correspondingquestion/${request.params.id}/${request.params.questionID}/options`
      );
    }
    try {
      await options.addoption({
        optionname: request.body.optionname,
        questionID: request.params.questionID,
      });
      return response.redirect(
        `/displayelections/correspondingquestion/${request.params.id}/${request.params.questionID}/options/`
      );
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  }
);

module.exports = app;
