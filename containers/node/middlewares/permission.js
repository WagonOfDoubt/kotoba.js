const _ = require('lodash');

module.exports.postEditPermission = async (req, res, next) => {
  try {
    const { posts, set, postpassword } = req.body;
    const checkPost = (post) =>
      checkPostPermission(post, postpassword, req.user, set);
    const checkedPostsResults = await Promise.all(posts.map(checkPost));
    const [granted, denied] = _.partition(checkedPostsResults, 'ok');
    res.locals.permissionGranted = granted.map(o => _.omit(o, 'post'));
    res.locals.permissionDenied = denied.map(o => _.omit(o, 'post'));
    const allowedPosts = granted.map(_.property('post'));
    console.log('permissionGranted:', res.locals.permissionGranted);
    console.log('permissionDenied:', res.locals.permissionDenied);
    console.log('allowedPosts:', allowedPosts);
    req.body.posts = allowedPosts;
    next();
  } catch (err) {
    next(err);
  }
};


const checkPostPermission = (post, password, user, setObj) => {
  return new Promise(async (resolve, reject) => {
    const ref = post.toReflink();

    // TODO: temporary code, allows to do anything for logged in users
    // make proper staff permissions system
    if (user) {
      console.log('=== User logged in, resolve. !CHANGE ME!');
      resolve({ ref: ref, post: post, ok: true });
      return;
    }

    const passwordMatches = await post.checkPassword(password);
    // not mod, no password => GTFO
    if (!user && !passwordMatches) {
      resolve({ ref: ref, post: post, ok: false, reason: 'Incorrect password' });
      return;
    }

    // user wrote this post and can edit some fields
    if (!user && passwordMatches) {
      // [ key, value ] pairs that can be changed by unauthorized user if
      // they have correct password
      // TODO: make this customisable
      const guestPriviliges = [
        // anonymous can delete their own post, but can't restore it
        [ 'isDeleted', true ],
        // anonymous can close their own thread, but once and for all
        [ 'isClosed', true ],
        // anonymous can add or remove sage, if they had mistaken
        [ 'isSage', true ], [ 'isSage', false ],
      ];

      const setKV = _.toPairs(setObj);
      const diff = _.differenceWith(setKV, guestPriviliges, _.isEqual);

      // if some of changed values are not editable by non-logged in user,
      // deny to edit this post
      if (diff.length) {
        const deniedStuff = diff
          .map(([key, value]) => `set ${ key } to ${ value }`)
          .join(', ');
        const reason = `You have no rights to ${ deniedStuff }`;
        resolve({ ref: ref, post: post, ok: false, reason: reason })
        return;
      }

      resolve({ ref: ref, post: post, ok: true });
      return;
    }

    resolve({ ref: ref, post: post, ok: true });
  });
};
