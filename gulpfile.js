var gulp    = require("gulp")
var plumber = require("gulp-plumber")
var uglify  = require("gulp-uglify")
var flatten = require("gulp-flatten")
var concat  = require("gulp-concat")
var babel   = require("gulp-babel")
var postcss = require("gulp-postcss")
var tailwindcss = require("tailwindcss")
var autoprefixer = require("autoprefixer")

gulp.task("default", ["build"])
gulp.task("build", [
	"build-tailwind",
	"minify-js",
])

gulp.task("build-tailwind", function() {
	return gulp.src("static/css/input.css")
		.pipe(postcss([
			tailwindcss("./tailwind.config.js"),
			autoprefixer()
		]))
		.pipe(concat("output.css"))
		.pipe(gulp.dest("static/css"))
})

gulp.task("watch", function() {
	gulp.watch(["static/*.js", "!static/dist.min.js"], ["minify-js"])
	gulp.watch(["templates/**/*.html", "static/css/input.css", "tailwind.config.js"], ["build-tailwind"])
})

gulp.task("minify-js", function() {
	gulp
		.src([
			"static/licenseheader.js",
			"node_modules/jquery/dist/jquery.min.js",
			"node_modules/timeago/jquery.timeago.js",
			"node_modules/i18next/i18next.min.js",
			"node_modules/i18next-xhr-backend/i18nextXHRBackend.min.js",
			"static/key_plural.js",
			"static/ripple.js",
		])
		.pipe(plumber())
		.pipe(concat("dist.min.js"))
		/*.pipe(babel({
			presets: ["latest"]
		})) breaks vue */
		.pipe(flatten())
		.pipe(uglify({
			mangle: true,
			preserveComments: "license"
		}))
		.pipe(gulp.dest("./static"))
})
