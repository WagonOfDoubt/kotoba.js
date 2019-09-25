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
      const categoryOptions = [
        { value: "misc", label: 'Miscellaneous' },
        { value: "banner", label: 'Banners' },
        { value: "bg", label: 'Background' },
        { value: "favicon", label: 'Favicons' },
        { value: "logo", label: 'Logo' },
        { value: "news", label: 'News assets' },
        { value: "placeholder", label: 'Attachment placeholders' },
        { value: "style", label: 'Style assets' },
      ];
      res.render('manage/assets', {
        activity: 'manage-page-assets',
        assets: assets,
        groupedAssets: groupedAssets,
        title: 'Site assets',
        categoryOptions: categoryOptions,
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
