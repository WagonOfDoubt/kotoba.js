const express = require('express');
const ModlogEntry = require('../../models/modlog');

const router = express.Router();

router.get('/modlog/:before?',
  async (req, res, next) => {
    try {
      console.log(req.params);
      const q = req.params.before ? { timestamp: { $lt: req.params.before } } : {};
      const modlog = await ModlogEntry
        .find(q)
        .sort({ timestamp: -1})
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
