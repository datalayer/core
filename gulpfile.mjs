/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

import gulp from 'gulp';
import gap from 'gulp-append-prepend';
import watch from 'gulp-watch';
import filter from 'gulp-filter';

gulp.task('resources-to-lib-watch', function () {
  const f = filter([
    '**',
    '!src/**/*.js',
    '!src/**/*.ts',
    '!src/**/*.tsx',
  ]);
  return (
    watch('src/**/*', { ignoreInitial: false })
      // .pipe(gulp.dest('build'));
      // .src('./src/**/*.*')
      .pipe(f)
      .pipe(gulp.dest('./lib/'))
  );
});

gulp.task('resources-to-lib', async function () {
  const f = filter([
    '**',
    '!src/**/*.js',
    '!src/**/*.ts',
    '!src/**/*.tsx'
  ]);
  gulp.src('./src/**/*.*').pipe(f).pipe(gulp.dest('./lib/'));
  return;
});

gulp.task('licenses', async function () {
  // this is to add Datalayer licenses in the production mode for the minified js
  gulp
    .src('build/static/js/*chunk.js', { base: './' })
    .pipe(
      gap.prependText(`/*!

=========================================================
* Datalayer
=========================================================

* Product Page: https://datalayer.io
* Copyright 2024 Datalayer (https://datalayer.io)

=========================================================

*/`)
    )
    .pipe(gulp.dest('./', { overwrite: true }));

  // this is to add Datalayer licenses in the production mode for the minified html
  gulp
    .src('build/index.html', { base: './' })
    .pipe(
      gap.prependText(`<!--

=========================================================
* Datalayer
=========================================================

* Product Page: https://datalayer.io
* Copyright 2024 Datalayer (https://datalayer.io)

=========================================================

-->`)
    )
    .pipe(gulp.dest('./', { overwrite: true }));

  // this is to add Datalayer licenses in the production mode for the minified css
  gulp
    .src('build/static/css/*chunk.css', { base: './' })
    .pipe(
      gap.prependText(`/*!

=========================================================
* Datalayer
=========================================================

* Product Page: https://datalayer.io
* Copyright 2024 Datalayer (https://datalayer.io)

=========================================================
      
*/`)
    )
    .pipe(gulp.dest('./', { overwrite: true }));
  return;
});
