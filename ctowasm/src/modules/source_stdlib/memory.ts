/**
 * The js functions used for memory related imported functions - malloc, free etc.
 */

import { SharedWasmGlobalVariables } from "~src/modules";
import { checkAndExpandMemoryIfNeeded } from "~src/modules/util";

// represents a memory block that is allocated/deallocated
export interface MemoryBlock {
  address: number; // base address of the memory block in WebAssembly memory
  size: number; // size of the memory block in bytes
}

interface MallocFunctionParams {
  memory: WebAssembly.Memory;
  sharedWasmGlobalVariables: SharedWasmGlobalVariables;
  freeList: MemoryBlock[];
  allocatedBlocks: Map<number, number>; // map of address of allocated memory block to size
  bytesRequested: number;
}

export function mallocFunction({
  memory,
  sharedWasmGlobalVariables,
  bytesRequested,
  allocatedBlocks,
  freeList,
}: MallocFunctionParams): number {
  // see if freeList has any deallocated memory blocks
  // simple first fit algorithm
  let i = 0;
  let foundBlock = false;
  for (; i < freeList.length; ++i) {
    const block = freeList[i];
    if (block.size >= bytesRequested) {
      foundBlock = true;
      break;
    }
  }

  // a block was found in the free list
  if (foundBlock) {
    const block = freeList[i];
    freeList.splice(i, 1);
    if (block.size > bytesRequested) {
      const splitBlock = {
        address: block.address + bytesRequested,
        size: block.size - bytesRequested,
      };
      freeList.push(splitBlock);
    }
    allocatedBlocks.set(block.address, bytesRequested);
    return block.address;
  }

  // no suitable block on the free list, need to expand heap
  checkAndExpandMemoryIfNeeded(memory, bytesRequested, sharedWasmGlobalVariables); 

  // enlarge heap segment
  const address = sharedWasmGlobalVariables.heapPointer.value;
  sharedWasmGlobalVariables.heapPointer.value += bytesRequested;

  allocatedBlocks.set(address, bytesRequested);
  return address;
}

interface FreeFunctionParameters {
  address: number;
  allocatedBlocks: Map<number, number>; // map of address of allocated memory block to size
  freeList: MemoryBlock[];
}

export function freeFunction({
  address,
  freeList,
  allocatedBlocks,
}: FreeFunctionParameters) {
  // shrink heap segment
  const sizeOfBlock = allocatedBlocks.get(address);
  if (typeof sizeOfBlock === "undefined") {
    throw new Error("free(): No allocated block with given address");
  }

  // add the freed memory block to freeList
  freeList.push({ address: address, size: sizeOfBlock });
  allocatedBlocks.delete(address);
}

/**
 * Helper debug function for printing contents of the heap as an array of bytes.
 */
export function printHeap(
  memory: WebAssembly.Memory,
  heapAddress: number,
  heapPointer: number,
) {
  const memoryView = new Uint8Array(
    memory.buffer,
    heapAddress,
    heapPointer - heapAddress,
  );
  console.log(memoryView);
}

export function printStack(memory: WebAssembly.Memory, stackPointer: number) {
  const memoryView = new Uint8Array(
    memory.buffer,
    stackPointer,
    memory.buffer.byteLength - stackPointer,
  );
  console.log(memoryView);
}
