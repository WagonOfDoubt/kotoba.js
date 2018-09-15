const gulp = require('gulp');
const sass = require('gulp-sass');
const sourcemaps = require('gulp-sourcemaps');
const uglifycss = require('gulp-uglifycss');
const browserify = require('browserify');
const source = require('vinyl-source-stream');
const buffer = require('vinyl-buffer');
const uglify = require('gulp-uglify');
const gutil = require('gulp-util');
const del = require('del');
const babelify = require('babelify');
const watchify = require('watchify');


const paths = {
  styles: {
    src: ['./sass/*.scss', './sass/**/*.scss'],
    dest: '../html/.static/css',
  },
  scripts: {
    src: ['./js/*.js', './js/**/*.js'],
    dest: '../html/.static/js',
    entries: './js/kotoba.js',
  },
  clean: ['../html/.static/js/*', '../html/.static/css/*'],
};


gulp.task('styles', () => {
  return gulp.src(paths.styles.src)
    .pipe(sourcemaps.init())
    .pipe(sass().on('error', sass.logError))
    .pipe(uglifycss())
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest(paths.styles.dest));
});


gulp.task('styles:watch', () => {
  gulp.watch(paths.styles.src, ['styles']);
});


// https://github.com/gulpjs/gulp/blob/4.0/docs/recipes/fast-browserify-builds-with-watchify.md
// https://stackoverflow.com/questions/31708318/gulp-doesnt-exit-with-watchify-browserify
const browerifyOpts = {
  cache: {},
  packageCache: {},
  entries: paths.scripts.entries,
  debug: true,
  transform: babelify.configure({
    presets: ['@babel/env']
  }),
};


const watchifyOpts = Object.assign({}, watchify.args, browerifyOpts);
const b = browserify(browerifyOpts);
const w = watchify(browserify(watchifyOpts));


function bundle(bundler) {
  return bundler.bundle()
    .on('error', gutil.log.bind(gutil, 'Browserify Error'))
    .pipe(source('kotoba.js'))
    .pipe(buffer())
    .pipe(sourcemaps.init({loadMaps: true}))
    .pipe(uglify())
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest(paths.scripts.dest));
}


gulp.task('scripts', bundle.bind(null, b));


gulp.task('scripts:watch', () => {
  bundle(w);
  w.on('update', bundle.bind(null, w)); // on any dep update, runs the bundler
  w.on('log', gutil.log); // output build logs to terminal
});


gulp.task('clean', () =>  del(paths.clean, { force: true }));

gulp.task('default', ['styles', 'scripts']);
gulp.task('watch', ['styles:watch', 'scripts:watch']);
