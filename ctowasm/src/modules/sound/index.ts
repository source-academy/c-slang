import { ModulesGlobalConfig, SharedWasmGlobalVariables } from "~src/modules";
import { voidDataType } from "~src/modules/constants";
import wrapFunctionPtrCall from "~src/modules/stackFrameUtils";
import { Module, ModuleFunction, StackFrameArg } from "~src/modules/types";
import {
  extractCStyleStringFromMemory,
  getExternalFunction,
} from "~src/modules/util";
import { StructDataType } from "~src/parser/c-ast/dataTypes";
import { addCustomJsFunctionToTable } from "~src/modules/jsFunctionUtils";
import { MemoryArrayAccessor } from "~src/modules/memoryArrayAccessorUtils";

export const soundLibraryModuleImportName = "sound";

export class SoundLibraryModule extends Module {
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
      play_wave: {
        parentImportedObject: soundLibraryModuleImportName,
        functionType: {
          type: "function",
          parameters: [
              {
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
                          primaryDataType: "double",
                      }
                  }
              },
              {
                  type: "primary",
                  primaryDataType: "double",
              }
          ],
          returnType: {
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
        },
        jsFunction: (wave: number, duration: number) => {
          const waveJS = (t : number) => {
            const stackFrameArgs: StackFrameArg[] = [
              {
                  value: Number(t),
                  type: "double"
              },
            ]

            const returnValues = wrapFunctionPtrCall(
              memory,
              functionTable,
              wave,
              sharedWasmGlobalVariables,
              stackFrameArgs,
              ["double"],
            );

            return returnValues[0];
          }
          getExternalFunction("play_wave", config)(waveJS, duration);
          return [wave, duration];
        },
      },
      play: {
        parentImportedObject: soundLibraryModuleImportName,
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
          returnType: {
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
          getExternalFunction("play", config)([waveJS, duration]);
          return [wave, duration];
        }
      },
      play_in_tab: {
        parentImportedObject: soundLibraryModuleImportName,
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
          returnType: {
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
          getExternalFunction("play_in_tab", config)([waveJS, duration]);
          return [wave, duration];
        }
      },
      make_sound: {
        parentImportedObject: soundLibraryModuleImportName,
        functionType: {
          type: "function",
          parameters: [
            {
              type: "pointer",
              pointeeType: {
                type: "function",
                parameters: [
                  {
                    type: "primary",
                    primaryDataType: "double"
                  }
                ],
                returnType: {
                  type: "primary",
                  primaryDataType: "double"
              }
              }
          },
            {
              type: "primary",
              primaryDataType: "double"
            }
          ],
          returnType: {
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
                                      primaryDataType: "double"
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
          }
        },
        jsFunction: (funcPtr: number, duration: number)=>{
          return [funcPtr, duration];
        }
      },
      cello: {
        parentImportedObject: soundLibraryModuleImportName,
        functionType: {
          type: "function",
          parameters: [
            {
              type: "primary",
              primaryDataType: "signed int", 
            },
            {
              type: "primary",
              primaryDataType: "double", 
            },
          ],
          returnType: {
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
        },
        jsFunction: (note: number, duration: number) => {
          const sound = getExternalFunction("cello", config)(note, duration);
          const wave = addCustomJsFunctionToTable(
            sound[0],
            ["f64"],
            "f64",
            functionTable,
            memory,
            this.sharedWasmGlobalVariables
          );
          return [wave, sound[1]];
        }
      },
      bell: {
        parentImportedObject: soundLibraryModuleImportName,
        functionType: {
          type: "function",
          parameters: [
            {
              type: "primary",
              primaryDataType: "signed int", 
            },
            {
              type: "primary",
              primaryDataType: "double", 
            },
          ],
          returnType: {
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
        },
        jsFunction: (note: number, duration: number) => {
          const sound = getExternalFunction("bell", config)(note, duration);
          const wave = addCustomJsFunctionToTable(
            sound[0],
            ["f64"],
            "f64",
            functionTable,
            memory,
            this.sharedWasmGlobalVariables
          );
          return [wave, sound[1]];
        }
      },
      trombone: {
        parentImportedObject: soundLibraryModuleImportName,
        functionType: {
          type: "function",
          parameters: [
            {
              type: "primary",
              primaryDataType: "signed int", 
            },
            {
              type: "primary",
              primaryDataType: "double", 
            },
          ],
          returnType: {
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
        },
        jsFunction: (note: number, duration: number) => {
          const sound = getExternalFunction("trombone", config)(note, duration);
          const wave = addCustomJsFunctionToTable(
            sound[0],
            ["f64"],
            "f64",
            functionTable,
            memory,
            this.sharedWasmGlobalVariables
          );
          return [wave, sound[1]];
        }
      },
      violin: {
        parentImportedObject: soundLibraryModuleImportName,
        functionType: {
          type: "function",
          parameters: [
            {
              type: "primary",
              primaryDataType: "signed int", 
            },
            {
              type: "primary",
              primaryDataType: "double", 
            },
          ],
          returnType: {
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
        },
        jsFunction: (note: number, duration: number) => {
          const sound = getExternalFunction("violin", config)(note, duration);
          const wave = addCustomJsFunctionToTable(
            sound[0],
            ["f64"],
            "f64",
            functionTable,
            memory,
            this.sharedWasmGlobalVariables
          );
          return [wave, sound[1]];
        }
      },    
      piano: {
        parentImportedObject: soundLibraryModuleImportName,
        functionType: {
          type: "function",
          parameters: [
            {
              type: "primary",
              primaryDataType: "signed int", 
            },
            {
              type: "primary",
              primaryDataType: "double", 
            },
          ],
          returnType: {
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
        },
        jsFunction: (note: number, duration: number) => {
          const sound = getExternalFunction("piano", config)(note, duration);
          const wave = addCustomJsFunctionToTable(
            sound[0],
            ["f64"],
            "f64",
            functionTable,
            memory,
            this.sharedWasmGlobalVariables
          );
          return [wave, sound[1]];
        }
      },
      sawtooth_sound: {
        parentImportedObject: soundLibraryModuleImportName,
        functionType: {
          type: "function",
          parameters: [
            {
              type: "primary",
              primaryDataType: "double", // freq parameter as double
            },
            {
              type: "primary",
              primaryDataType: "double", // duration parameter
            },
          ],
          returnType: {
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
        },
        jsFunction: (freq: number, duration: number) => {
          const sound = getExternalFunction("sawtooth_sound", config)(freq, duration);
          const wave = addCustomJsFunctionToTable(
            sound[0],
            ["f64"],
            "f64",
            functionTable,
            memory,
            this.sharedWasmGlobalVariables
          );
          return [wave, sound[1]];
        }
      },
      triangle_sound: {
        parentImportedObject: soundLibraryModuleImportName,
        functionType: {
          type: "function",
          parameters: [
            {
              type: "primary",
              primaryDataType: "double", // freq parameter as double
            },
            {
              type: "primary",
              primaryDataType: "double", // duration parameter
            },
          ],
          returnType: {
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
        },
        jsFunction: (freq: number, duration: number) => {
          const sound = getExternalFunction("triangle_sound", config)(freq, duration);
          const wave = addCustomJsFunctionToTable(
            sound[0],
            ["f64"],
            "f64",
            functionTable,
            memory,
            this.sharedWasmGlobalVariables
          );
          return [wave, sound[1]];
        }
      },
      sine_sound: {
        parentImportedObject: soundLibraryModuleImportName,
        functionType: {
          type: "function",
          parameters: [
            {
              type: "primary",
              primaryDataType: "double", // freq parameter as double
            },
            {
              type: "primary",
              primaryDataType: "double", // duration parameter
            },
          ],
          returnType: {
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
        },
        jsFunction: (freq: number, duration: number) => {
          const sound = getExternalFunction("sine_sound", config)(freq, duration);
          const wave = addCustomJsFunctionToTable(
            sound[0],
            ["f64"],
            "f64",
            functionTable,
            memory,
            this.sharedWasmGlobalVariables
          );
          return [wave, sound[1]];
        }
      },
      square_sound: {
        parentImportedObject: soundLibraryModuleImportName,
        functionType: {
          type: "function",
          parameters: [
            {
              type: "primary",
              primaryDataType: "double", // freq parameter as double
            },
            {
              type: "primary",
              primaryDataType: "double", // duration parameter
            },
          ],
          returnType: {
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
        },
        jsFunction: (freq: number, duration: number) => {
          const sound = getExternalFunction("square_sound", config)(freq, duration);
          const wave = addCustomJsFunctionToTable(
            sound[0],
            ["f64"],
            "f64",
            functionTable,
            memory,
            this.sharedWasmGlobalVariables
          );
          return [wave, sound[1]];
        }
      },
      noise_sound: {
        parentImportedObject: soundLibraryModuleImportName,
        functionType: {
          type: "function",
          parameters: [
            {
              type: "primary",
              primaryDataType: "double", // duration parameter only
            },
          ],
          returnType: {
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
        },
        jsFunction: (duration: number) => {
          const sound = getExternalFunction("noise_sound", config)(duration);
          const wave = addCustomJsFunctionToTable(
            sound[0],
            ["f64"],
            "f64",
            functionTable,
            memory,
            this.sharedWasmGlobalVariables
          );
          return [wave, sound[1]];
        }
      },
      silence_sound: {
        parentImportedObject: soundLibraryModuleImportName,
        functionType: {
          type: "function",
          parameters: [
            {
              type: "primary",
              primaryDataType: "double",
            },
          ],
          returnType: {
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
        },
        jsFunction: (duration: number) => {
          const sound = getExternalFunction("silence_sound", config)(duration);
          const wave = addCustomJsFunctionToTable(
            sound[0],
            ["f64"],
            "f64",
            functionTable,
            memory,
            this.sharedWasmGlobalVariables
          );
          return [wave, sound[1]];
        }
      },
      letter_name_to_midi_note: {
        parentImportedObject: soundLibraryModuleImportName,
        functionType: {
          type: "function",
          parameters: [
            {
              type: "pointer",
              pointeeType: {
                type: "primary",
                primaryDataType: "signed char",
              },
            },
          ],
          returnType: {
            type: "primary",
            primaryDataType: "signed int"
          },
        },
        jsFunction: (strAddress: number) => {
          const noteStr = extractCStyleStringFromMemory(memory.buffer, strAddress);
          return getExternalFunction("letter_name_to_midi_note", config)(noteStr);
        }
      },
      letter_name_to_frequency: {
        parentImportedObject: soundLibraryModuleImportName,
        functionType: {
          type: "function",
          parameters: [
            {
              type: "pointer",
              pointeeType: {
                type: "primary",
                primaryDataType: "signed char",
              },
            },
          ],
          returnType: {
            type: "primary",
            primaryDataType: "double"
          },
        },
        jsFunction: (strAddress: number) => {
          const noteStr = extractCStyleStringFromMemory(memory.buffer, strAddress);
          return getExternalFunction("letter_name_to_frequency", config)(noteStr);
        }
      },
      midi_note_to_frequency: {
        parentImportedObject: soundLibraryModuleImportName,
        functionType: {
          type: "function",
          parameters: [
            {
              type: "primary",
              primaryDataType: "signed int", 
            },
          ],
          returnType: {
            type: "primary",
            primaryDataType: "double" 
          },
        },
        jsFunction: (midiNote: number) => {
          return getExternalFunction("midi_note_to_frequency", config)(midiNote);
        }
      },
      stop: {
        parentImportedObject: soundLibraryModuleImportName,
        functionType: {
          type: "function",
          parameters: [],
          returnType: voidDataType,
        },
        jsFunction: () => {
          getExternalFunction("stop", config)();
        }
      },
      consecutively: {
        parentImportedObject: soundLibraryModuleImportName,
        functionType: {
          type: "function",
          parameters: [
            {
              type: "pointer",
              pointeeType: {
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
              }
            },
            {
              type: "primary",
              primaryDataType: "signed int",
            }
          ],
          returnType: {
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
          } 
        },
        jsFunction: (soundArrayPtr: number, count: number) => {
          const soundFields = [
            { name: 'wave', type: 'funcPtr' },
            { name: 'duration', type: 'f64' }
          ];
          
          const soundAccessor = new MemoryArrayAccessor(
            memory,
            functionTable,
            soundArrayPtr,
            count,
            soundFields
          );

          const sounds = [];
          
          while (soundAccessor.hasNext()) {
            const element = soundAccessor.getCurrentElement();
            const wavePtr = element.wave;
            const duration = element.duration;

            const waveJS = (t: number) => {
              const stackFrameArgs: StackFrameArg[] = [
                { value: Number(t), type: "double" }
              ];
              
              const returnValues = wrapFunctionPtrCall(
                memory,
                functionTable,
                wavePtr,
                sharedWasmGlobalVariables,
                stackFrameArgs,
                ["double"]
              );
              
              return returnValues[0];
            };
            
            sounds.push([waveJS, duration]);
            
            soundAccessor.next();
          }

          // Convert the array of sounds to a List (as defined in sound in modules)
          let soundList = null;
          
          // Build the list in reverse order (since we're prepending)
          for (let i = sounds.length - 1; i >= 0; i--) {
            soundList = [sounds[i], soundList];
          }
          
          const resultSound = getExternalFunction("consecutively", config)(soundList);
          
          const newWavePtr = addCustomJsFunctionToTable(
            resultSound[0],
            ["f64"],
            "f64",
            functionTable,
            memory,
            this.sharedWasmGlobalVariables
          );

          return [newWavePtr, resultSound[1]];
        }
      },
      simultaneously: {
        parentImportedObject: soundLibraryModuleImportName,
        functionType: {
          type: "function",
          parameters: [
            {
              type: "pointer",
              pointeeType: {
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
              }
            },
            {
              type: "primary",
              primaryDataType: "signed int",
            }
          ],
          returnType: {
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
          } 
        },
        jsFunction: (soundArrayPtr: number, count: number) => {      
          const soundFields = [
            { name: 'wave', type: 'funcPtr' },
            { name: 'duration', type: 'f64' }
          ];
          
          const soundAccessor = new MemoryArrayAccessor(
            memory,
            functionTable,
            soundArrayPtr,
            count,
            soundFields
          );
      
          const sounds = [];
          
          while (soundAccessor.hasNext()) {
            const element = soundAccessor.getCurrentElement();
            const wavePtr = element.wave;
            const duration = element.duration;
      
            const waveJS = (t: number) => {
              const stackFrameArgs: StackFrameArg[] = [
                { value: Number(t), type: "double" }
              ];
              
              const returnValues = wrapFunctionPtrCall(
                memory,
                functionTable,
                wavePtr,
                sharedWasmGlobalVariables,
                stackFrameArgs,
                ["double"]
              );
              
              return returnValues[0];
            };
            
            sounds.push([waveJS, duration]);
            
            soundAccessor.next();
          }
      
          // Convert the array of sounds to a List (as defined in sound in modules)
          let soundList = null;
          
          // Build the list in reverse order (since we're prepending)
          for (let i = sounds.length - 1; i >= 0; i--) {
            soundList = [sounds[i], soundList];
          }
          
          const resultSound = getExternalFunction("simultaneously", config)(soundList);
          
          const newWavePtr = addCustomJsFunctionToTable(
            resultSound[0],
            ["f64"],
            "f64",
            functionTable,
            memory,
            this.sharedWasmGlobalVariables
          );
      
          return [newWavePtr, resultSound[1]];
        }
      }
    };
  }
}