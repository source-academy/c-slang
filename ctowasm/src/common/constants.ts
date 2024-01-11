/**
 * A collection of constant objects and values.
 * These constants are used across compiler modules.
 */

export const WASM_ADDR_SIZE = 4; // number of bytes of a wasm address
export const POINTER_SIZE = WASM_ADDR_SIZE; // size of a pointer in bytes - should be same as WASM_ADDR_SIZE

export const SIZE_OF_EXPR_RESULT_DATA_TYPE = "unsigned int" // implmentation-defined