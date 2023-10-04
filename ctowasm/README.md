# ctowasm

C compiler to Webassembly

# Instructions

## Build

Run `yarn` first to download all dependencies.
Then run `yarn build` to build the bundle. All the final bundle will be in a single index.js file in the [/build](/build) folder

## Commands

Here are some commands you can run during development for testing and using ctowasm locally.

`yarn compile < C input filepath > [-o <output filepath>]` - compiles the c program specified by the filepath, and places output at specified filepath (_output/a.out_ by default)

`yarn generate-c-ast < C input filepath > [-o <output filepath>]` - generates the C AST for the input file, and converts it to JSON and stores the output in specified filepath (_output/c-ast.json_) by default.

`yarn generate-wat-ast < C input filepath > [-o <output filepath>]` - generates the WAT AST for the input file, and converts it JSON and stores the output in the specified filepath (_output/wat-ast.json_) by default

## Testing Instructions

Before running any tests, you must build WABT, which is included in this project as a git submodule. To do so, you must first have cmake installed.

Steps to building WABT:

1. `git submobule update --init` - initialize the wabt wabt
2. `cd external/wabt`
3. `git submodule update --init` - initialize the submodule within wabt
4. `mkdir build`
5. `cd build`
6. `cmake ..`
7. `cmake --build .`

This will build all the included binaries in WABT and output them in the [external/wabt/build](external/wabt/build) folder.
