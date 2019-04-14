import babelify from 'babelify';
import browserify from 'browserify';
import buffer from 'vinyl-buffer';
import del from 'del';
import gulp from 'gulp';
import gutil from 'gulp-util';
import sass from 'gulp-sass';
import pug from 'gulp-pug';
import umd from 'gulp-umd';
import source from 'vinyl-source-stream';
import sourcemaps from 'gulp-sourcemaps';
import uglify from 'gulp-uglify';
import uglifycss from 'gulp-uglifycss';
import watchify from 'watchify';


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
  templates: {
    src: ['./js/templates/*.pug', './js/templates/**/*.pug', '!./js/templates/mixins/*.pug'],
    dest: './js/templates-compiled',
    base: './js/templates',
  },
  clean: ['../html/.static/js/*', '../html/.static/css/*', './js/templates-compiled/*'],
};


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

export const styles = () => {
  return gulp.src(paths.styles.src)
    .pipe(sourcemaps.init())
    .pipe(sass().on('error', sass.logError))
    .pipe(uglifycss())
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest(paths.styles.dest));
};


const moduleTemplate = `import pug from 'pug-runtime';
<%= contents %>
export default <%= exports %>;`;

export const templates = () => {
  return gulp.src(paths.templates.src)
    .pipe(pug({
      client: true,
      basedir: paths.templates.base,
      debug: false,
      compileDebug: false,
      inlineRuntimeFunctions: false,
    }))
    .pipe(umd({
      exports: () => 'template',
      templateSource: moduleTemplate,
    }))
    .pipe(gulp.dest(paths.templates.dest));
};

export const scripts = () => bundle(b);

export const clean = () =>  del(paths.clean, { force: true });

export const watch_bundle = () => {
  gulp.watch(paths.styles.src, styles);
  gulp.watch(paths.templates.src, templates);
  bundle(w);
  w.on('update', bundle.bind(null, w)); // on any dep update, runs the bundler
  w.on('log', gutil.log); // output build logs to terminal
};

export const watch = gulp.series(clean, templates, styles, watch_bundle);

const build = gulp.series(
  clean,
  gulp.parallel(
    styles,
    gulp.series(templates, scripts)
  )
);

export default build;
