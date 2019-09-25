const express = require('express');
const Role = require('../../models/role');
const { authRequired } = require('../../middlewares/permission');

const router = express.Router();

router.get('/roles/:roleName?',
  authRequired,
  async (req, res, next) => {
    try {
      let role;
      const roles = await Role.findAllAndSort();
      if (req.params.roleName) {
        role = roles.find((r) => r.roleName === req.params.roleName);
      }
      res.render('manage/roles', {
        activity: 'manage-page-roles',
        title: 'Edit roles',
        roles: roles,
        role: role,
      });      
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
