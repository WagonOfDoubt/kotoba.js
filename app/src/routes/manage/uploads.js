const express = require('express');
const Post = require('../../models/post');

const router = express.Router();

router.get('/uploads',
  async (req, res, next) => {
    try {
      const posts = await Post
        .find(
          {'attachments.0': { $exists: true }},
          {'attachments': 1, 'boardUri': 1, 'postId': 1, 'threadId': 1, 'timestamp': 1}
        )
        .sort({'timestamp': -1})
        .limit(500);
      res.render('manage/uploads', {
        activity: 'manage-page-upoads',
        title: 'Recent upoads',
        posts: posts,
      });
    } catch(err) {
      next(err);
    }
  }
);

module.exports = router;
