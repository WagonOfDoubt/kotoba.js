const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const flash = require('connect-flash');
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const cookieParser = require('cookie-parser');

const formRouter = require('./routes/form');
const authRouter = require('./routes/auth');
const manageRouter = require('./routes/manage');
const previewRouter = require('./routes/preview');

const apiBoardRouter = require('./api/board');
const apiNewsRouter = require('./api/news');
const apiUserRouter = require('./api/user');
const apiSettingsRouter = require('./api/settings');
const apiMaintenanceRouter = require('./api/maintenance');

const config = require('./config.json');
const User = require('./models/user');
const middlewares = require('./utils/middlewares');

// connect to database
const dbHost = process.env.DATABASE_HOST || 'mongo';
const dbPort = process.env.DATABASE_PORT || 27017;
const dbName = process.env.DATABASE_NAME || 'kotoba';
const dbUser = process.env.DATABASE_USER || '';
const dbPass = process.env.DATABASE_PASSWORD || '';
const dbAuth = dbUser && dbPass ? `${ dbUser }:${ dbPass }@` : '';
const dbConn = `mongodb://${ dbAuth }${ dbHost }:${ dbPort }/${ dbName }`;
mongoose.Promise = global.Promise;
mongoose.connect(dbConn, {
  useMongoClient: true
})
  .then(() => console.log(`Connected to database ${ dbName }`))
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
app.use(middlewares.globalTemplateVariables);
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

// routers
app.use(formRouter);
app.use(apiBoardRouter);
app.use(apiNewsRouter);
app.use(apiUserRouter);
app.use(apiSettingsRouter);
app.use(apiMaintenanceRouter);
app.use(authRouter);
app.use(manageRouter);
app.use(previewRouter);

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
    if (req.is('json')) {
      if (isDev) {
        res.json({'error': err.message, 'stack': err.stack});
      } else {
        res.json({'error': err.message});
      }
    } else {
      res.render('errorpage', {
        title: 'Error',
        message: err.message,
        error: isDev ? err : {}
      });
    }
  }
);

app.get('/', (req, res) => res.sendStatus(418));

app.listen(3000, () => console.log('kotoba listening on port 3000!'));
