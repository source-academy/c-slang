# c-slang

Needs Node 24 (the version in `.node-version`; see the [Node.js version](https://github.com/source-academy/documentation/blob/main/app/docs/developers/node-version.md) page).

C compiler that generates WebAssembly code, written in TypeScript, intended for teaching C programming in a browser-only environment.

This repository consists of 2 subprojects:

- ctowasm: a C compiler that generates WebAssembly code, written in TypeScript, intended for teaching C programming in a browser-only environment. 
  _Refer to the [README](ctowasm/README.md) in the ctowasm project directory for more information on ctowasm_
- c-viz: a C code interpreter & visualizer

## Build Instructions  

1. Ensure you are in the root of the repository
2. Install the c-viz submodule with `git submodule update --init`
3. Run `yarn install` to install dependencies
4. Run `yarn install-all` to install all dependencies of subprojects
5. Run `yarn build` to build the project

c-slang can then be published to npm by running `yarn publish`

## Visualizer plugin

A tool that shows a C program's execution in the Source Academy workspace is a plugin, found through the plugin directory, not a part of the frontend. How to write one (the parts, the trace protocol, the host contract, building and releasing) is described in [Writing a visualizer plugin](https://github.com/source-academy/documentation/blob/main/app/docs/developers/writing-a-visualizer-plugin.md).
