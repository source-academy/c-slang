# c-viz

A C parser+interpreter+visualizer written in JS that runs in the browser.

Workflow inspired by https://github.com/felixhao28/JSCPP

- `grunt` to watch & build
- `npm run build` to build
- `npm run test` to run tests

## String and memory library

`#include <string.h>` provides `size_t`, `NULL`, `strlen`, `strcmp`, `strcpy`,
`memset`, and `memcpy`. A matching explicit prototype also exposes a native
function. These names require declarations; the legacy `malloc`, `free`, and
`print` builtins remain available without headers. `size_t` is currently
`unsigned int`, matching `sizeof` in the interpreter's fixed data model.

Library calls perform parameter conversions and execute in one machine step.
String comparisons use unsigned bytes. Memory copies preserve byte order,
initialization flags, and source effective types for allocated destinations;
declared destinations keep their types. Copying unknown bytes or padding does
not mark them initialized. Partial writes invalidate affected inferred types.

Calls diagnose null pointers (including with zero count), known storage overruns,
freed storage, protected writes, and prohibited overlap before writing. Valid
one-past pointers are accepted for zero-length operations. Checks cover complete
live objects and allocations: address-only pointers cannot reliably distinguish
subobjects or stale pointers after address reuse. General uninitialized-read
diagnostics remain deferred.

The embedded header omits `restrict`, which the parser does not support, while
enforcing the copying functions' overlap restrictions. Other system headers
retain their previous no-op behavior; quoted includes try the local resolver
before falling back to the embedded header.

B1 still needs formatted I/O (`printf`/`scanf`, including variadic calls and input
support) and `<math.h>`. `memmove`, the rest of `<string.h>`, and general system
header support are outside this first slice. See the project-level `b1-plan.md`
for completion status, tests, and remaining work.
