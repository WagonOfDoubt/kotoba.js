const express = require('express');
const ModlogEntry = require('../../models/modlog');
const { authRequired } = require('../../middlewares/permission');

const router = express.Router();

router.get('/modlog/:before?',
  authRequired,
  async (req, res, next) => {
    try {
      console.log(req.params);
      const q = req.params.before ? { createdAt: { $lt: req.params.before } } : {};
      const modlog = await ModlogEntry
        .find(q)
        .sort({ createdAt: -1})
        .limit(10)
        .populate([
          { path: 'changes.target' },
          { path: 'user', model: 'User' },
        ]);
      res.render('manage/modlog', {
        activity: 'manage-page-modlog',
        modlog: modlog,
        title: 'ModLog'
      });      
    } catch (e) {
      next(e);
    }
  }
);

module.exports = router;
