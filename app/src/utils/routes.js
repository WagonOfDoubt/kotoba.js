/**
 * Returns object with all routes in stack of given express router, where keys
 * are paths and values are arrays of supported methods.
 * @module utils/routes
 * @param {Object} stack router.stack of express router
 * @returns {Object} Object with routes paths as keys and arrays of methods as
 * values
 * @example
 * const express = require('express');
 * const app = express();
 * app.get('/home', (req, res) => ...);
 * app.get('/news', (req, res) => ...);
 * app.get('/blog', (req, res) => ...);
 * app.post('/blog', (req, res) => ...);
 *
 * const nestedRouter = express.Router();
 * nestedRouter.get('/images', (req, res) => ...);
 * nestedRouter.post('/images', (req, res) => ...);
 * nestedRouter.delete('/images', (req, res) => ...);
 * app.use('/gallery', nestedRouter);
 *
 * const routes = require('utils/routes')(app._router.stack);
 * console.log(routes);
 *
 * // Result:
 * {
 *   "/home": ["get"],
 *   "/news": ["get"],
 *   "/blog": ["get", "post"],
 *   "/gallery/images": ["get", "post", "delete"]
 * }
 */
const findRoutes = module.exports = (stack, routesMap={}, parent=null) => {
  stack.forEach((layer) => {
    if (layer.route && layer.route.path) {
      let path = layer.route.path;
      // /^\/(path)\/?(?=\/|$)/i
      const parentRe = /\^\\\/(.*)\\\/\?\(\?\=\\\/\|\$\)/i
      if (parent) {
        const parentPath = parent.regexp.source.match(parentRe);
        if (parentPath) {
          path = `/${ parentPath[1] }${ path }`;
        }          
      }
      let methods = Object.keys(layer.route.methods);
      if (routesMap[path]) {
        methods = [...methods, ...routesMap[path]];
      }
      if (methods.length > 20) {
        methods = ["ALL"];
      }
      routesMap[path] = methods;
      return;
    }
    if (layer.name === 'router') {
      // router middleware
      findRoutes(layer.handle.stack, routesMap, layer);
      return;
    }
  });
  return routesMap;
};
