import { ModulesGlobalConfig, SharedWasmGlobalVariables } from "~src/modules";
import { voidDataType } from "~src/modules/constants";
import wrapFunctionPtrCall from "~src/modules/stackFrameUtils";
import { Module, ModuleFunction, StackFrameArg } from "~src/modules/types";
import {
  getExternalFunction,
} from "~src/modules/util";
import { StructDataType } from "~src/parser/c-ast/dataTypes";

export const plotlyLibraryModuleImportName = "plotly";

export class PlotlyLibraryModule extends Module {
  moduleDeclaredStructs: StructDataType[];
  moduleFunctions: Record<string, ModuleFunction>;
  sharedWasmGlobalVariables: SharedWasmGlobalVariables;

  constructor(
    memory: WebAssembly.Memory,
    functionTable: WebAssembly.Table,
    config: ModulesGlobalConfig,
    sharedWasmGlobalVariables: SharedWasmGlobalVariables,
  ) {
    super(memory, functionTable, config, sharedWasmGlobalVariables);
    this.sharedWasmGlobalVariables = sharedWasmGlobalVariables;
    this.moduleDeclaredStructs = [];
    this.moduleFunctions = {
      draw_sound_2d: {
        parentImportedObject: plotlyLibraryModuleImportName,
        functionType: {
          type: "function",
          parameters: [
            {
              type: "struct",
              tag: "Sound",
              fields: [
                {
                  tag: "wave",
                  dataType: {
                    type: "pointer",
                    pointeeType: {
                      type: "function",
                      parameters: [
                        {
                          type: "primary",
                          primaryDataType: "double",
                        }
                      ],
                      returnType: {
                        type: "primary",
                        primaryDataType: "double"
                      }
                    }
                  },
                  isConst: false
                },
                {
                  tag: "duration",
                  dataType: {
                    type: "primary",
                    primaryDataType: "double"
                  },
                  isConst: false
                }
              ]
            },
          ],
          returnType: voidDataType
        },
        jsFunction: (wave: number, duration: number) => {
          const waveJS = (t: number) => {
            const stackFrameArgs: StackFrameArg[] = [
              {
                value: Number(t),
                type: "double"
              },
            ];
      
            const returnValues = wrapFunctionPtrCall(
              memory,
              functionTable,
              wave,
              sharedWasmGlobalVariables,
              stackFrameArgs,
              ["double"],
            );
            return returnValues[0];
          };
          getExternalFunction("draw_sound_2d", config)([waveJS, duration]);
        }
      },
    };
  }
}