const express = require('express');
const passport = require('passport');
const router = express.Router();
const { body, validationResult } = require('express-validator/check');

const middlewares = require('../utils/middlewares');
const User = require('../models/user');
const config = require('../config.json');


router.use(middlewares.globalTemplateVariables);


/*
 * Sets cookie kot.user with user login, id and authority if user is looged in
 * and clears cookie if not.
 */
const setUserCookie = (req, res) => {
  if (!req.user) {
    res.clearCookie('kot.user');
    return;
  }
  res.cookie('kot.user',
    JSON.stringify({
      id: req.user._id,
      login: req.user.login,
      authority: req.user.authority,
    }),
    {
      maxAge: config.session_age
    }
  );
};


router.get('/manage/login', (req, res) => {
  res.render('loginpage', {
    errors: [...req.flash('errors'), ...req.flash('error') ]
  });
});


router.get('/manage/logout', async (req, res) => {
  req.logout();
  setUserCookie(req, res);
  res.redirect('/');
});


router.get('/manage/registration', (req, res) => {
  res.render('registrationpage', {
    errors: [...req.flash('errors'), ...req.flash('error') ]
  });
});


router.post('/manage/login',
  (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        // failureFlash
        req.flash('errors', ['Invalid username or password.']);
        // failureRedirect
        return res.redirect('/manage/login');
      }
      req.login(user, (err) => {
        if (err) {
          return next(err);
        }
        setUserCookie(req, res);
        // successRedirect
        const redirectTo = req.session.redirectTo || '/manage';
        const redirectHash = req.body.redirectHash || '';
        delete req.session.redirectTo;
        return res.redirect(redirectTo + redirectHash);
      });
    })(req, res, next);
  });


router.post('/manage/registration', [
    body('login', 'Login is required')
      .exists(),
    body('password', 'Password is required')
      .exists(),
    body('login', 'Login must be between 6 and 25 characters long')
      .exists()
      .isLength({ min: 6, max: 25 }),
    body('login', 'Login must contain only letters and numbers')
      .isAlphanumeric(),
    body('password', 'Password must be at between 6 and 72 characters long and contain one number')
      .exists()
      .isLength({ min: 6, max: 72 })
      .matches(/\d/),
    body('repeat', 'Passwords does not match')
      .exists()
      .custom((value, { req }) => value === req.body.password)
  ],
  async (req, res, next) => {
    const { login, password } = req.body;

    // check request params
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      req.flash('errors', errors.array());
      res.redirect('/manage/registration');
      return;
    }

    // check if login already taken
    const loginAlreadyUsed = await User.findOne({ login }).exec();
    if (loginAlreadyUsed) {
      req.flash('errors', ['This login already taken']);
      res.redirect('/manage/registration');
      return;
    }

    // if no users was created, first user will be admin
    const numberOfUsers = await User.count().exec();
    const authority = numberOfUsers === 0
      ? 'admin'
      : 'guest';

    // create new user
    const user = new User({ login, password, authority });
    try {
      await user.save();
    } catch (err) {
      return next(err);
    }

    // sign in
    req.login(user, (err) => {
      if (err) {
        return next(err);
      }
      setUserCookie(req, res);
      res.redirect('/manage');
    });
});

module.exports = router;
