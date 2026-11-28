import {ModulesGlobalConfig, SharedWasmGlobalVariables} from "~src/modules";
import {NULL_PTR_ADR, voidDataType} from "~src/modules/constants";
import {Module, ModuleFunction} from "~src/modules/types";
import {StructDataType} from "~src/parser/c-ast/dataTypes";
import {
    convertFloatToCStyleString,
    extractCStyleStringFromMemory, getAddressOfRegisteredObj,
    getExternalFunction, loadObjectFromRegistry,
    storeObjectInMemoryAndRegistry
} from "~src/modules/util";
import {MemoryBlock} from "~src/modules/source_stdlib/memory";

// the name that this module is imported into wasm by,
// as well as the include name to use in C program file.
export const binaryTreeLibraryModuleImportName = "binary_tree";

export class BinaryTreeLibrary extends Module {
    moduleDeclaredStructs: StructDataType[];
    moduleFunctions: Record<string, ModuleFunction>;
    sharedWasmGlobalVariables: SharedWasmGlobalVariables;

    constructor(
        memory: WebAssembly.Memory,
        functionTable: WebAssembly.Table,
        allocatedBlocks: Map<number, number>,
        freeList: MemoryBlock[],
        objectReferenceRegistry: Map<number, any>,
        config: ModulesGlobalConfig,
        sharedWasmGlobalVariables: SharedWasmGlobalVariables,
    ) {
        super(memory, functionTable, allocatedBlocks, freeList, objectReferenceRegistry, config, sharedWasmGlobalVariables);
        this.sharedWasmGlobalVariables = sharedWasmGlobalVariables;
        this.moduleDeclaredStructs = [];
        this.moduleFunctions = {
            make_tree: {
                parentImportedObject: binaryTreeLibraryModuleImportName,
                functionType: {
                    type: "function",
                    parameters: [
                        {
                            type: "primary",
                            primaryDataType: "signed int"
                        },
                        {
                            type: "pointer",
                            pointeeType: voidDataType
                        },
                        {
                            type: "pointer",
                            pointeeType: voidDataType
                        }
                    ],
                    returnType: {
                        type: "pointer",
                        pointeeType: voidDataType
                    },
                },
                jsFunction: (value: number, leftBTreePtr: number, rightBTreePtr: number) => {
                    const bTreeObj = getExternalFunction("make_tree", this.config)(
                        value,
                        // make_empty_tree returns null
                        leftBTreePtr == NULL_PTR_ADR ? null : loadObjectFromRegistry(
                            this.objectReferenceRegistry,
                            leftBTreePtr
                        ),
                        rightBTreePtr == NULL_PTR_ADR ? null : loadObjectFromRegistry(
                            this.objectReferenceRegistry,
                            rightBTreePtr
                        )
                    );

                    return storeObjectInMemoryAndRegistry(
                        this.memory,
                        this.objectReferenceRegistry,
                        this.sharedWasmGlobalVariables,
                        this.allocatedBlocks,
                        this.freeList,
                        bTreeObj
                    )
                }
            },
            make_empty_tree: {
                parentImportedObject: binaryTreeLibraryModuleImportName,
                functionType: {
                    type: "function",
                    parameters: [],
                    returnType: {
                        type: "pointer",
                        pointeeType: voidDataType
                    }
                },
                jsFunction: () => {
                    // make_empty_tree returns a null
                    return NULL_PTR_ADR;
                }
            },
            entry: {
                parentImportedObject: binaryTreeLibraryModuleImportName,
                functionType: {
                    type: "function",
                    parameters: [
                        {
                            type: "pointer",
                            pointeeType: voidDataType
                        }
                    ],
                    returnType: {
                        type: "primary",
                        primaryDataType: "signed int"
                    }
                },
                jsFunction: (bTreePtr: number) => {
                    return getExternalFunction("entry", this.config)(
                        loadObjectFromRegistry(
                            this.objectReferenceRegistry,
                            bTreePtr
                        )
                    );
                }
            },
            left_branch: {
                parentImportedObject: binaryTreeLibraryModuleImportName,
                functionType: {
                    type: "function",
                    parameters: [
                        {
                            type: "pointer",
                            pointeeType: voidDataType
                        }
                    ],
                    returnType: {
                        type: "pointer",
                        pointeeType: voidDataType
                    }
                },
                jsFunction: (bTreePtr: number) => {
                    const bTreeObj = getExternalFunction("left_branch", this.config)(
                        loadObjectFromRegistry(
                            this.objectReferenceRegistry,
                            bTreePtr
                        )
                    );
                    if (bTreeObj === null) {
                        return NULL_PTR_ADR;
                    }
                    return getAddressOfRegisteredObj(bTreeObj);
                }
            },
            right_branch: {
                parentImportedObject: binaryTreeLibraryModuleImportName,
                functionType: {
                    type: "function",
                    parameters: [
                        {
                            type: "pointer",
                            pointeeType: voidDataType
                        }
                    ],
                    returnType: {
                        type: "pointer",
                        pointeeType: voidDataType
                    }
                },
                jsFunction: (bTreePtr: number) => {
                    const bTreeObj = getExternalFunction("right_branch", this.config)(
                        loadObjectFromRegistry(
                            this.objectReferenceRegistry,
                            bTreePtr
                        )
                    );
                    if (bTreeObj === null) {
                        return NULL_PTR_ADR;
                    }
                    return this.objectReferenceRegistry.get(
                        getAddressOfRegisteredObj(bTreeObj)
                    );
                }
            },
        }
    }
}



