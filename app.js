const express = require("express");
const app = express();
const csrf = require("tiny-csrf");
const cookieParser = require("cookie-parser");
const { admin } = require("./models");
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
            return done(null, false, { message: "Invalid Password!!!" });
          }
        })
        .catch(() => {
          return done(null, false, { message: "Invalid Email-ID!!!!" });
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
  admin
    .findByPk(id.id)
    .then((user) => {
      done(null, user);
    })
    .catch((error) => {
      done(error, null);
    });
});

app.post(
  "/session",
  passport.authenticate("user-local", {
    failureRedirect: "/login",
    failureFlash: true,
  }),
  async (request, response) => {
    return response.redirect("/homepage");
  }
);

app.get("/", (request, response) => {
  if (request.user) {
    return response.redirect("/homepage");
  } else {
    response.render("index", {
      title: "Welcom To Online Voting Platform",
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
    return response.redirect("/homepage");
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
        request.flash("success", "Signup successfully!");
        response.redirect("/homepage");
      }
    });
  } catch (error) {
    console.log(error);
    request.flash("error", "User already Exist with this mail!");
    return response.redirect("/signup");
  }
});

app.get("/homepage", connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
  let uid = await admin.findByPk(req.user.id);
  let name = uid.dataValues.firstName;
  try {
    if (req.accepts("html")) {
      res.render("homepage", {
        title: "Online Voting Homepage",
        uid,
        userName: name,
      });
    }
  } catch (error) {
    console.log(error);
    return res.status(422).json(error);
  }
});

module.exports = app;
