const express = require('express');
const Asset = require('../../models/asset');

const router = express.Router();

router.get('/trash/',
  async (req, res, next) => {
    try {
      const deletedAssets = await Asset.find({ isDeleted: true }).exec();

      res.render('manage/trash', {
        activity: 'manage-page-trash',
        deletedAssets: deletedAssets,
        title: 'Recycle Bin'
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
