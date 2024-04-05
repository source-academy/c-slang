import { ModulesGlobalConfig, SharedWasmGlobalVariables } from "~src/modules";
import { Module, ModuleFunction } from "~src/modules/types";
import { StructDataType } from "~src/parser/c-ast/dataTypes";
import { SIZE_T } from "~src/common/constants";
import utilityEmscriptenModuleFactoryFn from "~src/modules/utility/emscripten/utility";
import { extractCStyleStringFromMemory } from "~src/modules/util";

// the name that this module is imported into wasm by,
// as well as the include name to use in C program file.
export const utilityStdLibName = "utility";

export class UtilityStdLibModule extends Module {
  moduleDeclaredStructs: StructDataType[];
  moduleFunctions: Record<string, ModuleFunction>;
  heapAddress: number; // address of first item in heap

  // functions whose value is be filled later after this.instantiate() is called.
  atof: Function = () => {}; 
  atoi: Function = () => {}; 
  atol: Function = () => {};
  abs: Function = () => {}; 
  labs: Function = () => {}; 
  rand: Function = () => {}; 
  srand: Function = () => {}; 
  qsort: Function = () => {}; 
  stringToNewUTF8: Function = () => {};
  free: Function = () => {};

  constructor(
    memory: WebAssembly.Memory,
    functionTable: WebAssembly.Table,
    config: ModulesGlobalConfig,
    sharedWasmGlobalVariables: SharedWasmGlobalVariables
  ) {
    super(memory, functionTable, config, sharedWasmGlobalVariables);
    this.heapAddress = this.sharedWasmGlobalVariables.heapPointer.value;
    this.moduleDeclaredStructs = [];
    this.instantiate = async () => {
      const utilityModule = await utilityEmscriptenModuleFactoryFn(); 
      // need to set the jsFunctions of all moduleFunctions here
      this.atof = utilityModule._atof;
      this.free = utilityModule._free;
      this.stringToNewUTF8 = utilityModule.stringToNewUTF8;
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
          return this.atoi(str);
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
          return this.atol(str);
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
        jsFunction: () => {},
      },
    };
  }
}
