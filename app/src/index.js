/**
 *     __           __          __                 _      
 *    / /__ ____   / /_ ____   / /_   ____ _      (_)_____
 *   / //_// __ \ / __// __ \ / __ \ / __ `/     / // ___/
 *  / ,<  / /_/ // /_ / /_/ // /_/ // /_/ /_    / /(__  ) 
 * /_/|_| \____/ \__/ \____//_.___/ \__,_/(_)__/ //____/  
 *                                          /___/         
 *
 *       i:r:.                                 ;:r:.     
 *    0M@M@M@M@Z.                          :@M@M@M@M@7   
 *   @M@M@M@M@M@M2                        M@M@M@M@M@M@M  
 *  BM@8     .M8WM@                     7M@X@7     i@M@i 
 *  Z@M        2X2X@i                  MMa20.       r@M2 
 *  MM@         :27r@0               .@X777         rM@r 
 *  Z@M.         .ir.XM:            2@i:i:          :@M7 
 *  BMB            .: :MS         .M0 ..            ;M@7 
 *  8@S              .  X@       7Mi                :MM2 
 *  @Wa               .  i@:    @8  .               :2@7 
 *  M87                .   @a .@7  .                .2M2 
 *  @27                     X8@.                    :r@7 
 *  M2:                  .       .                   rM2 
 *  @r:             . .             . .             ..B7 
 *  Mr           . . .   7i  .   7.  . . .           .02 
 *  @.        . . . .   8i02    MiM:  . . . .         87 
 *  M:     . . . . .   XZ .@:  Ma r@   . . . . .      S2 
 *  @.    . . . . . . 7Mi  SM 7M: .M2   . . . . .     07 
 *  M:   . . . . . .  8X   .8707   7M. . . . . . .    S2 
 *  @.  . . . . . .  :W     :2r     X.  . . . . . .   Z7 
 *  M. . . . . . . . .   . .     .   . . . . . . . .  a2 
 *  @   . . . . . . . . . . . . . . . . . . . . . . . W7 
 *  M. . . . . . . . . . . . . . . . . . . . . . . .  X2 
 *  @   . . . . . . . . . . . . . . . . . . . . . .   87 
 *  M:   . . . . . . . . . . . . . . . . . . . . . .  S2 
 *  @MW   . . . . . . . . . . . . . . . . . . . . .   Z7 
 *  M@Mr . . . . . . . .           . . . . . . . .  2@M7 
 *  @M7   . . . . . . .     :.:..   . . . . . . .   : Sr 
 *  M    . . . . . . . . 7M@M@M@M@   . . . . . .  :@M2a7 
 *  @   . . . . . . . .   MM@8@M@r  . . . . . . . 2M@MBi 
 *  M    . . . . . . . .   2M@M@   . . . . . . .   8S.27 
 *  @7i   . . . . . . . .   7SX   . . . . . . . .     87 
 *  7@MM   . . . . . . . .       . . . . . . . .     rM. 
 *   :@Mi         . . . . . . . . . . . . . .      ;@X   
 *     r8X   722i  . . . . . . . . . . . . .    .2M0     
 *       i@2iM@M@.  . . . . . . . . . . . .   MM@2       
 *         iX@2:         . . . .   . . . .   @M7         
 *            S2:    ..   . . .  .r       .S@i           
 *             .X@i 2@MW   . .   2M. .  .887             
 *                X0@ZM2  . .   :i: iM2SB.               
 *                  rMr    . . .M@Mi.@X:                 
 *                    78a       i2B0a                    
 *                      r@S.    :07                      
 *                        7W87X82                        
 *                           .                           
 */

/**
 * @file kotoba.js entry point. Starts express app on port described by env
 *    variable KOT_APP_PORT (default is 3000) and establishes connection to
 *    MongoDB database described by env variables KOT_DATABASE_HOST,
 *    KOT_DATABASE_PORT, KOT_DATABASE_NAME, KOT_DATABASE_USER,
 *    KOT_DATABASE_PASSWORD.
 */

const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const _ = require('lodash');

const routes = require('./routes');
const User = require('./models/user');
const Style = require('./models/style');
const { globalTemplateVariables } = require('./middlewares/params');
const { ensureMainPage } = require('./controllers/generate');

const config = require('./json/config.json');
const pkg = require('./package.json');

// add ffmpeg path to env
process.env.FFMPEG_PATH = require('ffmpeg-static').path;
process.env.FFPROBE_PATH = require('ffprobe-static').path;


/**
 * Establish connection with MongoDB database described by env variables
 *    KOT_DATABASE_HOST, KOT_DATABASE_PORT, KOT_DATABASE_NAME,
 *    KOT_DATABASE_USER, KOT_DATABASE_PASSWORD.
 * @return {Connection} Mongoose connection
 * @see {@link https://mongoosejs.com/docs/api/connection.html#connection_Connection}
 * @async
 */
const connectToDatabase = async (app) => {
  const dbHost = process.env.KOT_DATABASE_HOST || 'mongo';
  const dbPort = process.env.KOT_DATABASE_PORT || 27017;
  const dbName = process.env.KOT_DATABASE_NAME || 'kotoba';
  const dbUser = process.env.KOT_DATABASE_USER || '';
  const dbPass = process.env.KOT_DATABASE_PASSWORD || '';
  const dbAuth = dbUser && dbPass ? `${ dbUser }:${ dbPass }@` : '';
  const dbConn = `mongodb://${ dbAuth }${ dbHost }:${ dbPort }/${ dbName }`;

  // use native JS promises in mongoose
  mongoose.Promise = global.Promise;
  // debug mode for mongoose is set by NODE_ENV
  mongoose.set('debug', process.env.NODE_ENV === 'development');

  // make connection
  try {
    await mongoose.connect(dbConn, {
      useNewUrlParser: true,
      useCreateIndex: true,
    });
    console.log(`kotoba.js connected to database ${ dbConn }`);
  } catch (err) {
    console.error(err);
  }

  // get MongoDB version
  const admin = new mongoose.mongo.Admin(mongoose.connection.db);
  admin.buildInfo((err, info) => {
    app.set('kot_mongo_version', info.version);
    console.log(`MongoDB version: ${info.version}`);
  });
  
  const db = mongoose.connection;
  db.on('error', console.error);
  return db;
};


/**
 * Configure authentication 
 * @param  {Application} app Express application
 * @see {@link http://www.passportjs.org/packages/passport-local/}
 */
const configureAuthentication = (app) => {
  app.use(require('cookie-parser')());
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
  app.use(passport.initialize());
  app.use(passport.session());

  // http://www.passportjs.org/packages/passport-local/
  passport.use(new LocalStrategy({
      usernameField: 'login',
      passwordField: 'password',
      passReqToCallback: false,
      session: true
    },
    async (login, password, done) => {
      await User
        .findOne({ login: login }, { password: 1, login: 1, authority: 1 },
          async (err, user) => {
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
};


/**
 * Create express app and initialize required middlewares
 * @see {@link https://expressjs.com/en/4x/api.html}
 */
const initApp = () => {
  const app = express();
  // set native express vars
  app.set('views', './templates');
  app.set('view engine', 'pug');
  // set custom express vars
  app.set('kot_routes', require('./utils/routes')(routes.stack));
  app.set('kot_mongoose_version', mongoose.version);
  app.set('kot_sharp_versions', require('sharp').versions);

  // middlewares
  app.use(globalTemplateVariables);
  app.use(require('express-useragent').express());
  app.use(require('connect-flash')());
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  configureAuthentication(app);
  // this middleware MUST be added last, or everything above won't work
  app.use(routes);

  connectToDatabase(app)
    .then(() => Promise.all([
      ensureMainPage(),
      Style.ensureDefaults(),
    ]))
    .catch(console.error);

  // error handler
  app.use((err, req, res, next) => {
      res.status(err.status || 500);
      console.log(err);
      const isDev = process.env.NODE_ENV === 'development';
      const productionErrorFields = ['name', 'message'];
      const debugErrorFields = ['name', 'message', 'stack'];
      const errfields = isDev ? debugErrorFields : productionErrorFields;
      const errobj = _.pick(err, errfields);
      if (req.is('json') || req.route.path.startsWith('/api')) {
        res.json({ 'error': errobj });
      } else {
        res.render('errorpage', {
          title: 'Error',
          error: errobj
        });
      }
    }
  );

  const port = process.env.KOT_APP_PORT;
  app.listen(port, () => console.log(`\
 ▄   ▄  ｷﾀ━━━(ﾟ∀ﾟ)━━━!!
▐ ▀▄▀ ▌ ${pkg.name} v${pkg.version}
▐     ▌ listening
▐  v  ▌ on port
 ▀▄ ▄▀  ${port}
   ▀    `));
};

// はじまるよ
initApp();
