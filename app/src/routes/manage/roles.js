const express = require('express');
const Role = require('../../models/role');
const { authRequired } = require('../../middlewares/permission');

const router = express.Router();


router.get('/roles/',
  authRequired,
  async (req, res, next) => {
    try {
      const roles = await Role.findAllAndSort();
      res.render('manage/roles', {
        activity: 'manage-page-roles',
        title: 'Roles',
        roles: roles,
        crud: 'read',
      });
    } catch (err) {
      next(err);
    }
  }
);


router.get('/roles/create',
  authRequired,
  async (req, res, next) => {
    try {
      res.render('manage/roles', {
        activity: 'manage-page-roles',
        title: 'Create role',
        crud: 'create',
      });
    } catch (err) {
      next(err);
    }
  }
);


router.get('/roles/edit/:roleName',
  authRequired,
  async (req, res, next) => {
    try {
      const roles = await Role.findAllAndSort();
      const role = roles.find((r) => r.roleName === req.params.roleName);
      res.render('manage/roles', {
        activity: 'manage-page-roles',
        title: 'Edit role',
        roles: roles,
        role: role,
        crud: 'update',
      });
    } catch (err) {
      next(err);
    }
  }
);


module.exports = router;
