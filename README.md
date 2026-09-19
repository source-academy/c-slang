# c-slang

C compiler that generates WebAssembly code, written in TypeScript, intended for teaching C programming in a browser-only environment.

This repository consists of 2 subprojects:

- ctowasm: a C compiler that generates WebAssembly code, written in TypeScript, intended for teaching C programming in a browser-only environment. 
  _Refer to the [README](ctowasm/README.md) in the ctowasm project directory for more information on ctowasm_
- c-interpreter: a C code interpreter & visualizer (originally `caipng/c-viz`, vendored directly
  into this repo; no longer a git submodule, so no separate checkout step is needed)

## Build Instructions  

1. Ensure you are in the root of the repository
2. Run `yarn install` to install dependencies
3. Run `yarn install-all` to install all dependencies of subprojects
4. Run `yarn build` to build the project

c-slang can then be published to npm by running `yarn publish`
