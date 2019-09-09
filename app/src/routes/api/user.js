const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const _ = require('lodash');

const User = require('../../models/user');
const Role = require('../../models/role');
const Board = require('../../models/board');
const userController = require('../../controllers/user');
const { apiAuthRequired, adminOnly } = require('../../middlewares/permission');
const { validateRequest } = require('../../middlewares/validation');
const { DocumentAlreadyExistsError, DocumentNotFoundError } = require('../../errors');
const { ConflictError } = require('../../errors/base-error');


router.get('/api/me', [
    apiAuthRequired,
  ],
  async (req, res, next) => {
    try {
      const userFields = [
        'displayname',
        'login',
        'authority',
        'addedon',
        'lastactive',
        'contacts',
        'boardRoles',
      ];
      const user = _.pick(req.user.toObject(), userFields);
      if (user.boardRoles) {
        const roleIds = Array.from(user.boardRoles.values());
        const roleNames = await Role.find({ _id: { $in: roleIds } }, { roleName: 1 });
        const idToRoleName = roleNames.reduce((acc, role) => {
          const { _id, roleName } = role.toObject();
          return { ...acc, [_id]: roleName };
        }, {});
        user.boardRoles = Array.from(user.boardRoles.entries())
          .reduce((acc, [key, value]) => {
            return { ...acc, [key]: idToRoleName[value.toString()] };
          }, {});
      }
      res.json(user);
    } catch (err) {
      return next(err);
    }
  }
);


// modify user
router.patch('/api/me', [
    apiAuthRequired,
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
    apiAuthRequired,
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
    body('password', `Password must be between 6 and 72 characters long and contain at least one number`)
      .exists()
      .isLength({ min: 6, max: 72 })
      .matches(/\d/),
    body('password', `New password and current password are identical`)
      .custom((password, { req }) => password !== req.body.old_password),
    body('password_confirmation', `Passwords don't match`)
      .exists()
      // check if password confirmation matches password
      .custom((password_confirmation, { req }) => password_confirmation === req.body.password),
    validateRequest,
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


router.delete('/api/me', [
    apiAuthRequired,
    body('login')
      .custom((login, { req }) => req.user.login === login)
      .withMessage('Login is incorrect'),
    body('password')
      .custom((passwords) => passwords['0'] === passwords['1'] && passwords['0'] === passwords['2'])
      .withMessage(`Passwords don't match`),
    body('password')
      .custom((passwords, { req }) => {
        return User
          .findById(req.user._id)
          .select(['password', 'authority'])
          .exec()
          .then(currentUser => {
            if (currentUser.authority === 'admin') {
              return Promise.reject(`Admin account can not be deleted`);
            }
            return currentUser.checkPassword(passwords['0']);
          })
          .then(passwordValid => {
            if (!passwordValid) {
              return Promise.reject(`Password is incorrect`);
            }
            return true;
          });
        }),
    validateRequest,
  ],
  async (req, res, next) => {
    try {
      const status = await userController.removeUser(req.user._id);
      res.clearCookie('kot.user');
      req.logout();
      res.send(status);
    } catch (err) {
      next(err);
    }
  }
);


router.get('/api/user', [
    apiAuthRequired,
  ],
  async (req, res, next) => {
    try {
      const query = _.pick(req.query || {}, ['login', 'authority', 'displayname']);
      const users = await User.find(query, [], { sort: { lastactive: -1 } });
      res.json(users);
    } catch (err) {
      next(err);
    }
  }
);


router.patch('/api/user', [
    apiAuthRequired,
    adminOnly,
    body('user').exists().withMessage('user is required'),
    validateRequest,
  ],
  async (req, res, next) => {
    try {
      const selectQuery = { login: req.body.user };
      const updateQuery = { $set: _.pick(req.body, ['authority']) };
      const status = await User.updateOne(selectQuery, updateQuery);
      res.json(status);
    } catch (err) {
      next(err);
    }
  }
);


const getStaffMember = async (req, res, next) => {
  try {
    const staffMember = await User.findOne({ login: req.body.user }, { authority: 1, boardRoles: 1 });
    req.body.staffMember = staffMember;
    next();
  } catch (err) {
    next(err);
  }
};


const checkUserAuthority = (req, res, next) => {
  try {
    if (req.body.staffMember.authority === 'admin') {
      const userIsAdminError = new ConflictError('Admin does not require any permissions');
      return userIsAdminError.respond(res);
    }
    next();
  } catch (err) {
    next(err);
  }
};


router.put('/api/user/role', [
    apiAuthRequired,
    adminOnly,
    body('user').exists().withMessage('user is required'),
    body('role').exists().withMessage('role is required'),
    body('board').exists().withMessage('board is required'),
    validateRequest,
    getStaffMember,
    checkUserAuthority,
  ],
  async (req, res, next) => {
    try {
      const role = await Role.findOne({ roleName: req.body.role });
      const board = req.body.board;
      const allBoards = await Board.distinct('uri');
      const staffMember = req.body.staffMember;
      if (staffMember.boardRoles && staffMember.boardRoles.has(board)) {
        const roleAlreadyDefined = new DocumentAlreadyExistsError('Role for board', 'board', board, 'body');
        return roleAlreadyDefined.respond(res);
      }
      if (!allBoards.includes(board)) {
        const noSuchBoard = new DocumentNotFoundError('Board', 'board', board, 'body');
        return noSuchBoard.respond(res);
      }
      const updateQuery = _.fromPairs([[`boardRoles.${ board }`, role._id]]);
      const status = await User.findByIdAndUpdate(staffMember._id, updateQuery, { runValidators: true, rawResult: true });
      res.json(_.pick(status, ['ok']));
    } catch (err) {
      next(err);
    }
  }
);


router.patch('/api/user/role', [
    apiAuthRequired,
    adminOnly,
    body('user').exists().withMessage('user is required'),
    body('role').exists().withMessage('role is required'),
    body('board').exists().withMessage('board is required'),
    validateRequest,
    getStaffMember,
    checkUserAuthority,
  ],
  async (req, res, next) => {
    try {
      const role = await Role.findOne({ roleName: req.body.role });
      const board = req.body.board;
      const staffMember = req.body.staffMember;
      if (staffMember.boardRoles && !staffMember.boardRoles.has(board)) {
        const noSuchRole = new DocumentNotFoundError('Role for board', 'board', board, 'body');
        return noSuchRole.respond(res);
      }
      const updateQuery = _.fromPairs([[`boardRoles.${ board }`, role._id]]);
      const status = await User.findByIdAndUpdate(staffMember._id, updateQuery, { runValidators: true, rawResult: true });
      res.json(_.pick(status, ['ok']));
    } catch (err) {
      next(err);
    }
  }
);


router.delete('/api/user/role', [
    apiAuthRequired,
    adminOnly,
    body('user').exists().withMessage('user is required'),
    body('board').exists().withMessage('board is required'),
    validateRequest,
    getStaffMember,
    checkUserAuthority,
  ],
  async (req, res, next) => {
    try {
      const board = req.body.board;
      const updateQuery = { $unset: { [`boardRoles.${ board }`]: 1 } };
      console.log(updateQuery);
      const staffMember = req.body.staffMember;
      const status = await User.findByIdAndUpdate(staffMember._id, updateQuery, { runValidators: true, rawResult: true });
      res.json(_.pick(status, ['ok']));
    } catch (err) {
      next(err);
    }
  }
);


module.exports = router;
