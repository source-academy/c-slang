import { ModulesGlobalConfig, SharedWasmGlobalVariables } from "~src/modules";
import { Module, ModuleFunction } from "~src/modules/types";
import { StructDataType } from "~src/parser/c-ast/dataTypes";
import mathModuleFactoryFn from "~src/modules/math/emscripten/math";

// the name that this module is imported into wasm by,
// as well as the include name to use in C program file.
export const mathStdlibName = "math";

export class MathStdLibModule extends Module {
  moduleDeclaredStructs: StructDataType[];
  moduleFunctions: Record<string, ModuleFunction>;
  heapAddress: number; // address of first item in heap

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
      const mathModule = await mathModuleFactoryFn();
      this.moduleFunctions.sin.jsFunction = mathModule._sin;
    };
    this.moduleFunctions = {
      sin: {
        parentImportedObject: mathStdlibName,
        functionType: {
          type: "function",
          parameters: [
            {
              type: "primary",
              primaryDataType: "double",
            },
          ],
          returnType: { type: "primary", primaryDataType: "double" },
        },
        jsFunction: () => {}, // temp value for now, will be set later
      },
    };
  }
}
