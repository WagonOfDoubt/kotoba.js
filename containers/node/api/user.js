const express = require('express');
const router = express.Router();
const { body } = require('express-validator/check');

const User = require('../models/user');
const userController = require('../controllers/user');
const middlewares = require('../utils/middlewares');


// TODO get user
router.get('/api/me', [
    middlewares.apiAuthRequired,
  ],
  async (req, res, next) => {
    try {
      const user = await User.findById(req.user._id);
      res.json(user);
    } catch (err) {
      return next(err);
    }
  }
);


// TODO create user
router.put('/api/me', [
    middlewares.apiAuthRequired,
  ],
  async (req, res, next) => {
    res.status(501).send();
  }
);


// modify user
router.patch('/api/me', [
    middlewares.apiAuthRequired,
  ],
  async (req, res, next) => {
    try {
      const status = await userController.updateUser(req.user._id, req.body);
      res.json(status);
    } catch (err) {
      return next(err);
    }
  }
);


// change user password
router.patch('/api/me/password', [
    middlewares.apiAuthRequired,
    body('old_password')
      .exists().withMessage(`Old password is required`)
      // check if old password is correct
      .custom((old_password, { req }) => {
        return User
          .findById(req.user._id)
          .select(['password'])
          .exec()
          .then(currentUser => {
            return currentUser.checkPassword(old_password);
          });
        }).withMessage(`Old password is incorrect`),
    body('password', `Password is required`)
      .exists(),
    body('password', `Password must be between 6 and 72 characters long and contain one number`)
      .exists()
      .isLength({ min: 6, max: 72 })
      .matches(/\d/),
    body('password', `New password and current password are identical`)
      .custom((password, { req }) => password !== req.body.old_password),
    body('password_confirmation', `Passwords don't match`)
      .exists()
      // check if password confirmation matches password
      .custom((password_confirmation, { req }) => password_confirmation === req.body.password),
    middlewares.validateRequest,
  ],
  async (req, res, next) => {
    try {
      const status = await userController.changeUserPassword(req.user._id, req.body.password);
      res.json(status);
    } catch (err) {
      return next(err);
    }
  }
);


// TODO delete user
router.delete('/api/me', [
    middlewares.apiAuthRequired,
  ],
  async (req, res, next) => {
    res.status(501).send();
  }
);


module.exports = router;
