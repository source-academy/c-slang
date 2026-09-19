module.exports = (grunt) => {
  require("load-grunt-tasks")(grunt);

  grunt.registerTask("build", "build", ["clean", "peg", "copy", "ts", "dist"]);

  grunt.registerTask("dist", "bundle into distribution version", [
    "browserify",
    "babel",
    "uglify",
  ]);

  grunt.registerTask("default", "watch & compile", ["build", "watch"]);

  const pkg = grunt.file.readJSON("package.json");
  return grunt.initConfig({
    pkg,

    copy: {
      build: {
        cwd: "src",
        src: ["**/*.js"],
        dest: "lib",
        expand: true,
      },
    },

    clean: {
      build: {
        src: ["lib", "dist/cviz.*"],
      },
    },

    browserify: {
      dist: {
        files: {
          "dist/cviz.js": ["lib/index.js"],
        },
      },
    },

    uglify: {
      dist: {
        files: {
          "dist/cviz.es5.min.js": ["dist/cviz.es5.js"],
        },
      },
    },

    babel: {
      options: {
        sourceMap: true,
        presets: ["@babel/preset-env"],
      },
      dist: {
        files: {
          "dist/cviz.es5.js": "dist/cviz.js",
        },
      },
    },

    peg: {
      build: {
        cwd: "parsers",
        src: ["**/*.pegjs"],
        dest: "src",
        ext: ".js",
        expand: true,
      },
    },

    ts: {
      default: {
        src: ["src/**/*.ts"],
        tsconfig: "./tsconfig.json",
      },
    },

    watch: {
      peg: {
        files: "parser/**/*.pegjs",
        tasks: ["newer:peg"],
      },
      copy: {
        files: ["src/**/*.js"],
        tasks: ["newer:copy"],
      },
    },
  });
};
