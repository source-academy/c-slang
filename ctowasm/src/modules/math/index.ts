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
    objectReferenceRegistry: Map<string, Object>,
    config: ModulesGlobalConfig,
    sharedWasmGlobalVariables: SharedWasmGlobalVariables,
  ) {
    super(memory, functionTable,objectReferenceRegistry, config, sharedWasmGlobalVariables);
    this.heapAddress = this.sharedWasmGlobalVariables.heapPointer.value;
    this.moduleDeclaredStructs = [];
    this.instantiate = async () => {
      const mathModule = await mathModuleFactoryFn();
      // need to set the jsFunctions of all moduleFunctions here
      this.moduleFunctions.acos.jsFunction = mathModule._acos;
      this.moduleFunctions.asin.jsFunction = mathModule._asin;
      this.moduleFunctions.atan.jsFunction = mathModule._atan;
      this.moduleFunctions.cos.jsFunction = mathModule._cos;
      this.moduleFunctions.cosh.jsFunction = mathModule._cosh;
      this.moduleFunctions.sin.jsFunction = mathModule._sin;
      this.moduleFunctions.sinh.jsFunction = mathModule._sinh;
      this.moduleFunctions.tanh.jsFunction = mathModule._tanh;
      this.moduleFunctions.exp.jsFunction = mathModule._exp;
      this.moduleFunctions.log.jsFunction = mathModule._log;
      this.moduleFunctions.log10.jsFunction = mathModule._log10;
      this.moduleFunctions.pow.jsFunction = mathModule._pow;
      this.moduleFunctions.sqrt.jsFunction = mathModule._sqrt;
      this.moduleFunctions.ceil.jsFunction = mathModule._ceil;
      this.moduleFunctions.floor.jsFunction = mathModule._floor;
      this.moduleFunctions.tan.jsFunction = mathModule._tan;
    };
    this.moduleFunctions = {
      acos: {
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
      asin: {
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
      atan: {
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
      cos: {
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
      cosh: {
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
      sinh: {
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
      tan: {
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
      tanh: {
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
      exp: {
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
      log: {
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
      log10: {
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
      pow: {
        parentImportedObject: mathStdlibName,
        functionType: {
          type: "function",
          parameters: [
            {
              type: "primary",
              primaryDataType: "double",
            },
            {
              type: "primary",
              primaryDataType: "double",
            },
          ],
          returnType: { type: "primary", primaryDataType: "double" },
        },
        jsFunction: () => {}, // temp value for now, will be set later
      },
      sqrt: {
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
      ceil: {
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
      floor: {
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
