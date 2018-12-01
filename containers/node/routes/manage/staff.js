const express = require('express');
const User = require('../../models/user');

const router = express.Router();

router.get('/staff/:userLogin?',
  async (req, res, next) => {
    try {
      let staffMember;
      if (req.params.userLogin) {
        staffMember = await User.findOne({ login: req.params.userLogin });
      }
      const staff = await User.find();
      res.render('manage/staff', {
        activity: 'manage-page-staff',
        title: 'Staff',
        staff: staff,
        staffMember: staffMember,
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
