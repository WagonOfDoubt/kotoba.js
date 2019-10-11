const express = require('express');
const _ = require('lodash');
const User = require('../../models/user');
const Role = require('../../models/role');
const Board = require('../../models/board');
const { authRequired } = require('../../middlewares/permission');

const router = express.Router();

const populateRoles = (staffMember, rolesMap) => {
  const memberRoles = {};
  if (staffMember.boardRoles) {
    staffMember.boardRoles
      .forEach((value, key) => {
        memberRoles[key] = rolesMap[value];
      });
    staffMember = staffMember.toObject();
    staffMember.boardRoles = memberRoles;
  }
  return staffMember;
};


router.get('/staff/',
  authRequired,
  async (req, res, next) => {
    try {
      const staff = await User.find();
      const roles = await Role.findAllAndSort();
      const rolesMap = roles.reduce((acc, role) => {
        const { _id, ...rest } = role;
        return { ...acc, [_id]: rest };
      }, {});
      const staffWithRoles = staff.map((u) => populateRoles(u, rolesMap));

      const query = _.pick(req.query, ['role', 'login', 'authority', 'board']);

      const staffOmitted = staffWithRoles.filter((sm) => {
        const smBoards = Array.from(Object.keys(sm.boardRoles || {}));
        const smRoles = Array.from(Object.values(sm.boardRoles || {})).map(r => r.roleName);
        return ((query.login && (query.login !== sm.login)) ||
          (query.authority && (query.authority !== sm.authority)) ||
          (query.role && !smRoles.includes(query.role)) ||
          (query.board && !smBoards.includes(query.board)));
      });

      res.render('manage/staff', {
        activity: 'manage-page-staff',
        title: 'Staff',
        staff: staffWithRoles,
        staffOmitted: staffOmitted,
        query: query,
        crud: 'read',
      });
    } catch (err) {
      next(err);
    }
  }
);


router.get('/staff/edit/:userLogin',
  authRequired,
  async (req, res, next) => {
    try {
      const staff = await User.find();
      const roles = await Role.findAllAndSort();
      const boards = await Board.findBoards();
      const rolesMap = roles.reduce((acc, role) => {
        const { _id, ...rest } = role;
        return { ...acc, [_id]: rest };
      }, {});
      const staffWithRoles = staff.map((u) => populateRoles(u, rolesMap));
      const staffMember = await staffWithRoles.find((u) => u.login === req.params.userLogin);

      res.render('manage/staff', {
        activity: 'manage-page-staff',
        title: 'Staff',
        roles: roles,
        boards: boards,
        staffMember: staffMember,
        crud: 'update',
      });
    } catch (err) {
      next(err);
    }
  }
);


module.exports = router;
