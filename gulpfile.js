const gulp = require('gulp');
const plumber = require('gulp-plumber');
const uglify = require('gulp-uglify');
const flatten = require('gulp-flatten');
const concat = require('gulp-concat');
const postcss = require('gulp-postcss');
const tailwindcss = require('tailwindcss');
const autoprefixer = require('autoprefixer');

// Build Tailwind CSS
function buildTailwind() {
    return gulp.src('web/static/css/input.css')
        .pipe(postcss([
            tailwindcss('./tailwind.config.js'),
            autoprefixer()
        ]))
        .pipe(concat('output.css'))
        .pipe(gulp.dest('web/static/css'));
}

// Minify JavaScript
function minifyJs() {
    return gulp
        .src([
            'web/static/licenseheader.js',
            'node_modules/jquery/dist/jquery.min.js',
            'node_modules/timeago/jquery.timeago.js',
            'web/static/key_plural.js',
            'web/static/soumetsu.js',
        ])
        .pipe(plumber())
        .pipe(concat('dist.min.js'))
        .pipe(flatten())
        .pipe(uglify({
            mangle: true,
            output: {
                comments: /^!/  // Preserve comments starting with !
            }
        }))
        .pipe(gulp.dest('./web/static'));
}

// Watch for changes
function watchFiles() {
    gulp.watch(['web/static/*.js', '!web/static/dist.min.js'], minifyJs);
    gulp.watch(['web/templates/**/*.html', 'web/static/css/input.css', 'tailwind.config.js'], buildTailwind);
}

// Export tasks
exports.default = gulp.parallel(buildTailwind, minifyJs);
exports.build = gulp.parallel(buildTailwind, minifyJs);
exports['build-tailwind'] = buildTailwind;
exports['minify-js'] = minifyJs;
exports.watch = watchFiles;
