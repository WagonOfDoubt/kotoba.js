const path = require('path');
const cssnext = require('postcss-cssnext');
const cssnano = require('cssnano');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');


const distFolder = path.resolve(__dirname, '../html/.static/');
const pathsToClean = ['js', 'css'];


module.exports = {
  entry: './js/kotoba.js',
  devtool: 'source-map',
  output: {
    filename: 'kotoba.js',
    path: path.resolve(__dirname, '../html/.static/js'),
  },
  plugins: [
    new UglifyJsPlugin({ sourceMap: true }),
    new ExtractTextPlugin('../css/global.css'),
    new CleanWebpackPlugin(pathsToClean, { root: distFolder }),
  ],
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /(node_modules)/,
        loader: 'babel-loader',
        query: {
          presets: ['es2015'],
        },
      },
      {
        test: /\.scss$/,
        use: ExtractTextPlugin.extract({
          fallback: 'style-loader?sourceMap',
          use: [
            'css-loader?sourceMap',
            {
              loader: 'postcss-loader?sourceMap',
              options: {
                ident: 'postcss',
                sourceMap: true,
                plugins: [
                  cssnext({
                    browsers: [
                      'since 2015',
                      '> 1%',
                    ],
                  }),
                  cssnano({ reduceIdents: false }),
                ],
              },
            },
            'sass-loader?sourceMap',
          ],
        }),
      },
    ],
  },
};
