const express = require('express');
const passport = require('passport');
const router = express.Router();
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator/check');

const config = require('../config.json');
const middlewares = require('../utils/middlewares');
const User = require('../models/user');


router.use(middlewares.globalTemplateVariables);


router.get('/manage/login', (req, res) => {
  res.render('loginpage');
});


router.get('/manage/logout', async (req, res) => {
  req.logout();
  await req.session.destroy();
  res.redirect('/');
});


router.post('/manage/login', 
  passport.authenticate('local', {
    failureRedirect: '/manage/login',
    successRedirect:'/manage'
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
      return res.render('registrationpage', {
        errors: errors.mapped()
      });
    }
    const { login, password, repeat } = req.body;

    const loginAlreadyUsed = await User.findOne({ login: login }).exec();
    if (loginAlreadyUsed) {
      const errors = {
        login: {
          msg: 'this login already taken'
        }
      };
      return res.render('registrationpage', {
        errors: errors
      });
    }

    const numberOfUsers = await User.count().exec();
    // if no users was created, first user will be admin
    const authority = numberOfUsers === 0
      ? 'admin'
      : 'guest';

    try {
      const hash = await bcrypt.hash(req.body.password, config.salt_rounds);
      const user = new User({
        login: login,
        password: hash,
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
      return res.render('registrationpage', {
        errors: errs
      });
    }

    res.redirect('/manage');
});

module.exports = router;
