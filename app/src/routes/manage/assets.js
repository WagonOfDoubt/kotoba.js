const express = require('express');
const _ = require('lodash');
const { authRequired } = require('../../middlewares/permission');

const Asset = require('../../models/asset');

const router = express.Router();

router.get('/assets/',
  authRequired,
  async (req, res, next) => {
    try {
      const assets = await Asset.find().exec();
      const groupedAssets = _.groupBy(assets, 'category');
      res.render('manage/assets', {
        activity: 'manage-page-assets',
        assets: assets,
        groupedAssets: groupedAssets,
        title: 'Site assets',
        crud: 'update',
      });
    } catch (err) {
      next(err);
    }
  }
);

router.get('/assets/create',
  authRequired,
  async (req, res, next) => {
    try {
      res.render('manage/assets', {
        activity: 'manage-page-assets',
        title: 'Upload assets',
        crud: 'create',
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
