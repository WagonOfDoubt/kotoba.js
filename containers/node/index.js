const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const flash = require('connect-flash');
const session = require('express-session');
const useragent = require('express-useragent');
const MongoStore = require('connect-mongo')(session);
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const cookieParser = require('cookie-parser');
const _ = require('lodash');

const routes = require('./routes');

const config = require('./config.json');
const User = require('./models/user');
const { globalTemplateVariables } = require('./middlewares/params');

// connect to database
const dbHost = process.env.DATABASE_HOST || 'mongo';
const dbPort = process.env.DATABASE_PORT || 27017;
const dbName = process.env.DATABASE_NAME || 'kotoba';
const dbUser = process.env.DATABASE_USER || '';
const dbPass = process.env.DATABASE_PASSWORD || '';
const dbAuth = dbUser && dbPass ? `${ dbUser }:${ dbPass }@` : '';
const dbConn = `mongodb://${ dbAuth }${ dbHost }:${ dbPort }/${ dbName }`;


mongoose.Promise = global.Promise;
mongoose.set('debug', true)
mongoose
  .connect(dbConn, { useNewUrlParser: true })
  .then(() => {
    console.log(`Connected to database ${ dbName }`);
    const admin = new mongoose.mongo.Admin(mongoose.connection.db);
    admin.buildInfo((err, info) => console.log('MongoDB version:', info.version));
  })
  .catch((err) => console.log(err));

const db = mongoose.connection;
db.on('error', (err) => console.error(err));
db.once('openUri', () => {
  console.log('Connected to database!');
});

// set express vars
const app = express();
app.set('views', './templates');
app.set('view engine', 'pug');

// middlewares
app.use(globalTemplateVariables);
app.use(useragent.express());
app.use(cookieParser());
app.use(session({
  name: config.session_cookie_name,
  secret: process.env.RANDOM_SEED,
  resave: false,
  saveUninitialized: true,
  cookie: {
    path: '/',
    httpOnly: false,
    secure: config.secure_cookies,
    maxAge: config.session_age,
  },
  store: new MongoStore({ mongooseConnection: mongoose.connection })
}));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(routes);

// configure authentification
passport.use(new LocalStrategy({
    usernameField: 'login',
    passwordField: 'password',
    passReqToCallback: false,
    session: true
  },
  async (login, password, done) => {
    User.findOne({ login: login }, { password: 1 }, async (err, user) => {
      if (err) { return done(err); }
      if (!user) {
        return done(null, false, { message: 'Incorrect username.' });
      }
      try {
        const validPassword = await user.checkPassword(password);
        if (!validPassword) {
          return done(null, false, { message: 'Incorrect password.' });
        }
        return done(null, user);
      } catch (e) {
        return done(e);
      }
    });
  }
));

passport.serializeUser((user, done) => done(null, user._id));
passport.deserializeUser((id, done) => User.findById(id, done));

// error handler
app.use((err, req, res, next) => {
    res.status(err.status || 500);
    console.log(err);
    const isDev = process.env.NODE_ENV === 'development';
    const productionErrorFields = ['name', 'message'];
    const debugErrorFields = ['name', 'message', 'stack'];
    const errfields = isDev ? debugErrorFields : productionErrorFields;
    const errobj = _.pick(err, errfields)
    if (req.is() === 'application/json') {
      res.json({ 'error': errobj });
    } else {
      res.render('errorpage', {
        title: 'Error',
        error: errobj
      });
    }
  }
);

app.get('/', (req, res) => res.sendStatus(418));

app.listen(3000, () => console.log('kotoba listening on port 3000!'));
