const express = require('express');

const router = express.Router();

router.get('/maintenance',
  async (req, res, next) => {
    try {
      res.render('manage/maintenance', {
        activity: 'manage-page-maintenance',
        title: 'Site maintenance'
      });
    } catch(err) {
      next(err);
    }
  }
);

module.exports = router;
