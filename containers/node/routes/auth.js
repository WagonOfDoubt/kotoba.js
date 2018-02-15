const express = require('express');
const passport = require('passport');
const router = express.Router();
const { body, validationResult } = require('express-validator/check');

const middlewares = require('../utils/middlewares');
const User = require('../models/user');


router.use(middlewares.globalTemplateVariables);


router.get('/manage/login', (req, res) => {
  res.render('loginpage', {
    errors: req.flash('errors') || [ req.flash('error') ]
  });
});


router.get('/manage/logout', async (req, res) => {
  req.logout();
  await req.session.destroy();
  res.redirect('/');
});


router.get('/manage/registration', (req, res) => {
  res.render('registrationpage', {
    errors: req.flash('errors') || [ req.flash('error') ]
  });
});


router.post('/manage/login',
  passport.authenticate('local', {
    failureRedirect: '/manage/login',
    successRedirect:'/manage',
    failureFlash: 'Invalid username or password.'
  }),
  (req, res) => {
    res.redirect('/');
  });


router.post('/manage/registration', [
    body('login', 'login is required')
      .exists(),
    body('password', 'password is required')
      .exists(),
    body('login', 'login must be between 6 and 25 characters long')
      .exists()
      .isLength({ min: 6, max: 25 }),
    body('login', 'login must contain only letters and numbers')
      .isAlphanumeric(),
    body('password', 'password must be at between 6 and 72 characters long and contain one number')
      .exists()
      .isLength({ min: 6, max: 72 })
      .matches(/\d/),
    body('repeat', 'passwords does not match')
      .exists()
      .custom((value, { req }) => value === req.body.password)
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      req.flash('errors', errors.array());
      res.redirect('/manage/registration');
      return;
    }
    const { login, password, repeat } = req.body;

    const loginAlreadyUsed = await User.findOne({ login: login }).exec();
    if (loginAlreadyUsed) {
      const errors = {
        login: {
          msg: 'this login already taken'
        }
      };
      req.flash('errors', errors);
      res.redirect('/manage/registration');
      return;
    }

    const numberOfUsers = await User.count().exec();
    // if no users was created, first user will be admin
    const authority = numberOfUsers === 0
      ? 'admin'
      : 'guest';

    try {
      const user = new User({
        login: login,
        password: password,
        authority: authority
      });
      await user.save();

      await new Promise((resolve, reject) => req.login(user, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      }));
    } catch (err) {
      console.log(err);
      const errs = {
        'error': {
          msg: 'Something went wrong'
        }
      };
      req.flash('errors', errs);
      res.redirect('/manage/registration');
      return;
    }

    res.redirect('/manage');
});

module.exports = router;
