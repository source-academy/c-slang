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
