# c-slang

C compiler that generates WebAssembly code, written in TypeScript, intended for teaching C programming in a browser-only environment.

This repository consists of 2 subprojects:

- ctowasm: a C compiler that generates WebAssembly code, written in TypeScript, intended for teaching C programming in a browser-only environment. 
- c-viz: a C code interpreter & visualizer

## Build Instructions  

1. Ensure you are in the root of the repository
2. Install the c-viz submodule with `git submodule update --init`
3. Run `yarn install` to install dependencies
4. Run `yarn install-all` to install all dependencies of subprojects
5. Run `yarn build` to build the project

c-slang can then be published to npm by running `yarn publish`
