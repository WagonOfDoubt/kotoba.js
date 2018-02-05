'use strict';
 
const assign = require('lodash.assign');
const babel = require('gulp-babel');
const babelify = require('babelify');
const browserify = require('browserify');
const buffer = require('vinyl-buffer');
const concat = require('gulp-concat');
const gulp = require('gulp');
const sass = require('gulp-sass');
const source = require('vinyl-source-stream');
const sourcemaps = require('gulp-sourcemaps');
const uglify = require('gulp-uglify');
const util = require('gulp-util');
const watchify = require('watchify');
const log = require('gulplog');

const browserifyCustomOpts = {
  entries: ['./js/kotoba.js'],
  debug: true,
  cache: {}
};

const browserifyOpts = assign({}, watchify.args, browserifyCustomOpts);
const b = watchify(browserify(browserifyOpts));
b.transform(babelify.configure({
    presets: ['env']
  })
);

gulp.task('sass', () => {
  return gulp.src(['./sass/*.scss', './sass/**/*.scss'])
    .pipe(sourcemaps.init())
    .pipe(sass().on('error', sass.logError))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('../html/.static/css'));
});


gulp.task('sass:watch', () => {
  gulp.watch(['./sass/*.scss', './sass/**/*.scss'], ['sass']);
});


// https://github.com/gulpjs/gulp/blob/master/docs/recipes/fast-browserify-builds-with-watchify.md
gulp.task('js', () => {
  return b.bundle()
    .on('error', log.error.bind(log, 'Browserify Error'))
    .pipe(source('./js/kotoba.js'))
    .pipe(buffer())
    .pipe(sourcemaps.init({ loadMaps: true }))
      // Add other gulp transformations (eg. uglify) to the pipeline here.
      .pipe(uglify())
      .on('error', util.log)
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest('../html/.static'));
});


gulp.task('js:watch', () => {
  gulp.watch('./js/*.js', './js/**/*.js', ['js']);
});


gulp.task('watch', () => {
  gulp.watch(['./sass/*.scss', './sass/**/*.scss'], ['sass']);
  gulp.watch(['./js/*.js', './js/**/*.js'], ['js']);
});
