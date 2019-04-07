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

const config = require('./json/config.json');
const pkg = require('./package.json');
const User = require('./models/user');
const { globalTemplateVariables } = require('./middlewares/params');

// add ffmpeg path to env
process.env.FFMPEG_PATH = require('ffmpeg-static').path;
process.env.FFPROBE_PATH = require('ffprobe-static').path;

// connect to database
const dbHost = process.env.DATABASE_HOST || 'mongo';
const dbPort = process.env.DATABASE_PORT || 27017;
const dbName = process.env.DATABASE_NAME || 'kotoba';
const dbUser = process.env.DATABASE_USER || '';
const dbPass = process.env.DATABASE_PASSWORD || '';
const dbAuth = dbUser && dbPass ? `${ dbUser }:${ dbPass }@` : '';
const dbConn = `mongodb://${ dbAuth }${ dbHost }:${ dbPort }/${ dbName }`;


mongoose.Promise = global.Promise;
mongoose.set('debug', process.env.NODE_ENV === 'development');
mongoose
  .connect(dbConn, { useNewUrlParser: true })
  .then(() => {
    console.log(`Connected to database ${ dbName }`);
    const admin = new mongoose.mongo.Admin(mongoose.connection.db);
    admin.buildInfo((err, info) => app.set('kot_mongo_version', info.version));
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

// configure authentication
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

app.get('/', (req, res) => res.sendStatus(418));

app.set('kot_routes', require('./utils/routes')(routes.stack));
app.set('kot_mongoose_version', mongoose.version);
app.set('kot_sharp_versions', require('sharp').versions);

app.listen(3000, () => console.log('kotoba listening on port 3000!'));
