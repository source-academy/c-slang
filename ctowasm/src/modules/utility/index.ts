import { ModulesGlobalConfig, SharedWasmGlobalVariables } from "~src/modules";
import { Module, ModuleFunction, StackFrameArg } from "~src/modules/types";
import { StructDataType } from "~src/parser/c-ast/dataTypes";
import { SIZE_T } from "~src/common/constants";
import utilityEmscriptenModuleFactoryFn from "~src/modules/utility/emscripten/utility";
import { extractCStyleStringFromMemory } from "~src/modules/util";
import wrapFunctionPtrCall from "~src/modules/stackFrameUtils";
import {
  freeFunction,
  mallocFunction,
} from "~src/modules/source_stdlib/memory";

// the name that this module is imported into wasm by,
// as well as the include name to use in C program file.
export const utilityStdLibName = "utility";

export class UtilityStdLibModule extends Module {
  moduleDeclaredStructs: StructDataType[];
  moduleFunctions: Record<string, ModuleFunction>;
  heapAddress: number; // address of first item in heap

  // functions whose value is be filled later after this.instantiate() is called.
  stringToNewUTF8: Function = () => {};
  addFunction: Function = () => {};
  malloc: Function = () => {};
  free: Function = () => {};
  atof: Function = () => {};
  atoi: Function = () => {};
  atol: Function = () => {};
  abs: Function = () => {};
  labs: Function = () => {};
  rand: Function = () => {};
  srand: Function = () => {};
  qsort: Function = () => {};
  emscriptenMemory?: WebAssembly.Memory;

  constructor(
    memory: WebAssembly.Memory,
    functionTable: WebAssembly.Table,
    objectReferenceRegistry: Map<string, Object>,
    config: ModulesGlobalConfig,
    sharedWasmGlobalVariables: SharedWasmGlobalVariables,
  ) {
    super(memory, functionTable, objectReferenceRegistry, config, sharedWasmGlobalVariables);
    this.heapAddress = this.sharedWasmGlobalVariables.heapPointer.value;
    this.moduleDeclaredStructs = [];
    this.instantiate = async () => {
      const utilityModule = await utilityEmscriptenModuleFactoryFn();
      // need to set the jsFunctions of all moduleFunctions here
      this.stringToNewUTF8 = utilityModule.stringToNewUTF8;
      this.addFunction = utilityModule.addFunction;
      this.malloc = utilityModule._malloc;
      this.free = utilityModule._free;
      this.atof = utilityModule._atof;
      this.atoi = utilityModule._atoi;
      this.atol = utilityModule._atol;
      this.abs = utilityModule._abs;
      this.labs = utilityModule._labs;
      this.rand = utilityModule._rand;
      this.srand = utilityModule._srand;
      this.qsort = utilityModule._qsort;
      this.emscriptenMemory = utilityModule.wasmMemory;
    };
    this.moduleFunctions = {
      atof: {
        parentImportedObject: utilityStdLibName,
        functionType: {
          type: "function",
          parameters: [
            {
              type: "pointer",
              pointeeType: {
                isConst: true,
                type: "primary",
                primaryDataType: "signed char",
              },
            },
          ],
          returnType: { type: "primary", primaryDataType: "double" },
        },
        jsFunction: (strAddress: number) => {
          const str = extractCStyleStringFromMemory(memory.buffer, strAddress);
          const strPtr = this.stringToNewUTF8(str);
          const floatVal = this.atof(strPtr);
          this.free(strPtr);
          return floatVal;
        },
      },
      atoi: {
        parentImportedObject: utilityStdLibName,
        functionType: {
          type: "function",
          parameters: [
            {
              type: "pointer",
              pointeeType: {
                isConst: true,
                type: "primary",
                primaryDataType: "signed char",
              },
            },
          ],
          returnType: { type: "primary", primaryDataType: "signed int" },
        },
        jsFunction: (strAddress: number) => {
          const str = extractCStyleStringFromMemory(memory.buffer, strAddress);
          const strPtr = this.stringToNewUTF8(str);
          const intVal = this.atoi(strPtr);
          this.free(strPtr);
          return intVal;
        },
      },
      atol: {
        parentImportedObject: utilityStdLibName,
        functionType: {
          type: "function",
          parameters: [
            {
              type: "pointer",
              pointeeType: {
                isConst: true,
                type: "primary",
                primaryDataType: "signed char",
              },
            },
          ],
          returnType: { type: "primary", primaryDataType: "signed long" },
        },
        jsFunction: (strAddress: number) => {
          const str = extractCStyleStringFromMemory(memory.buffer, strAddress);
          const strPtr = this.stringToNewUTF8(str);
          const intVal = this.atol(strPtr);
          this.free(strPtr);
          return intVal;
        },
      },
      abs: {
        parentImportedObject: utilityStdLibName,
        functionType: {
          type: "function",
          parameters: [
            {
              type: "primary",
              primaryDataType: "signed int",
            },
          ],
          returnType: { type: "primary", primaryDataType: "signed int" },
        },
        jsFunction: (val: number) => {
          return this.abs(val);
        },
      },
      labs: {
        parentImportedObject: utilityStdLibName,
        functionType: {
          type: "function",
          parameters: [
            {
              type: "primary",
              primaryDataType: "signed long",
            },
          ],
          returnType: { type: "primary", primaryDataType: "signed long" },
        },
        jsFunction: (val: number) => {
          return this.labs(val);
        },
      },
      rand: {
        parentImportedObject: utilityStdLibName,
        functionType: {
          type: "function",
          parameters: [],
          returnType: { type: "primary", primaryDataType: "signed int" },
        },
        jsFunction: () => {
          return this.rand();
        },
      },
      srand: {
        parentImportedObject: utilityStdLibName,
        functionType: {
          type: "function",
          parameters: [
            {
              type: "primary",
              primaryDataType: "unsigned int",
            },
          ],
          returnType: { type: "void" },
        },
        jsFunction: (val: number) => {
          this.srand(val);
        },
      },
      qsort: {
        parentImportedObject: utilityStdLibName,
        functionType: {
          type: "function",
          parameters: [
            {
              type: "pointer",
              pointeeType: {
                type: "void",
              },
            },
            {
              type: "primary",
              primaryDataType: SIZE_T,
            },
            {
              type: "primary",
              primaryDataType: SIZE_T,
            },
            {
              type: "pointer",
              pointeeType: {
                type: "function",
                parameters: [
                  {
                    type: "pointer",
                    pointeeType: { type: "void" },
                    isConst: true,
                  },
                  {
                    type: "pointer",
                    pointeeType: { type: "void" },
                    isConst: true,
                  },
                ],
                returnType: {
                  type: "primary",
                  primaryDataType: "signed int",
                },
              },
            },
          ],
          returnType: { type: "void" },
        },
        jsFunction: (
          ptr: number,
          count: number,
          size: number,
          funcPtr: number,
        ) => {
          const sortFn = (a: number, b: number) => {
            // need to allocate and copy a and b pointer objects to our memory (they are pointers to emscripten memory)
            const copiedAAddr: number = mallocFunction({
              memory,
              sharedWasmGlobalVariables,
              freeList: this.freeList,
              allocatedBlocks: this.allocatedBlocks,
              bytesRequested: size,
            });
            const copiedBAddr: number = mallocFunction({
              memory,
              sharedWasmGlobalVariables,
              freeList: this.freeList,
              allocatedBlocks: this.allocatedBlocks,
              bytesRequested: size,
            });
            const copiedABuff = new Uint8Array(
              this.memory.buffer,
              copiedAAddr,
              size,
            );
            const copiedBBuff = new Uint8Array(
              this.memory.buffer,
              copiedBAddr,
              size,
            );
            const origABuff = new Uint8Array(
              this.emscriptenMemory!.buffer,
              a,
              size,
            );
            const origBBuff = new Uint8Array(
              this.emscriptenMemory!.buffer,
              b,
              size,
            );
            for (let i = 0; i < size; ++i) {
              copiedABuff[i] = origABuff[i];
              copiedBBuff[i] = origBBuff[i];
            }

            // a and b are pointers to objects in memory
            const stackFrameArgs: StackFrameArg[] = [
              { value: BigInt(copiedAAddr), type: "unsigned int" },
              { value: BigInt(copiedBAddr), type: "unsigned int" },
            ];

            // call the function pointer
            const result = wrapFunctionPtrCall(
              memory,
              functionTable,
              funcPtr,
              sharedWasmGlobalVariables,
              stackFrameArgs,
              ["signed int"],
            )[0];

            freeFunction({
              address: copiedAAddr,
              freeList: this.freeList,
              allocatedBlocks: this.allocatedBlocks,
            });
            freeFunction({
              address: copiedBAddr,
              freeList: this.freeList,
              allocatedBlocks: this.allocatedBlocks,
            });
            return result;
          };
          // create funcPtr for the emscripten compiled module - 2nd arg is the function siganture,
          // see https://emscripten.org/docs/porting/connecting_cpp_and_javascript/Interacting-with-code.html
          // section on "Calling JavaScript functions as function pointers from C"
          const emscriptenFuncPtr = this.addFunction(sortFn, "iii");

          const memSize = count * size;

          // allocate space in emscripten module memory space
          const copiedObjectAddress: number = this.malloc(memSize);

          // copy contents from our memory space to the emscripten memory
          const srcBuffer = new Uint8Array(this.memory.buffer, ptr, memSize);
          const destBuffer = new Uint8Array(
            this.emscriptenMemory!.buffer,
            copiedObjectAddress,
            memSize,
          );
          for (let i = 0; i < memSize; ++i) {
            destBuffer[i] = srcBuffer[i];
          }
          // perform the sorting operation
          this.qsort(copiedObjectAddress, count, size, emscriptenFuncPtr);

          // copy sorted result back into our memory
          for (let i = 0; i < memSize; ++i) {
            srcBuffer[i] = destBuffer[i];
          }

          // free buffer from emscriptens memory
          this.free(copiedObjectAddress);
        },
      },
    };
  }
}
