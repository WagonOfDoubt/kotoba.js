const express = require('express');
const _ = require('lodash');
const User = require('../../models/user');
const Role = require('../../models/role');
const Board = require('../../models/board');

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

router.get('/staff/:userLogin?',
  async (req, res, next) => {
    try {
      let staffMember;
      const staff = await User.find();
      const roles = await Role.findAllAndSort();
      const boards = await Board.findBoards();
      const rolesMap = roles.reduce((acc, role) => {
        const { _id, ...rest } = role;
        return { ...acc, [_id]: rest };
      }, {});
      const staffWithRoles = staff.map((u) => populateRoles(u, rolesMap));
      if (req.params.userLogin) {
        staffMember = await staffWithRoles.find((u) => u.login === req.params.userLogin);
      }

      res.render('manage/staff', {
        activity: 'manage-page-staff',
        title: 'Staff',
        staff: staffWithRoles,
        roles: roles,
        boards: boards,
        staffMember: staffMember,
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
