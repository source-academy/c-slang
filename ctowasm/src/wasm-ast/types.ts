/**
 * Some type definitions for non-node objects.
 */

// Stores all the variables in a certain scope
export type Scope = Set<string>;

// all the scopes in a WASM function
export type Scopes = Scope[];

export type WasmType = "i32" | "i64" | "f32" | "f64";