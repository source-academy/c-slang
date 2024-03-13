/**
 * Contains utility function related to setting up a stack frame to wrap wasm function calls made from the JS runtime.
 */

import { WASM_ADDR_SIZE } from "~src/common/constants";
import { ScalarCDataType } from "~src/common/types";
import { getSizeOfScalarDataType } from "~src/common/utils";
import { SharedWasmGlobalVariables } from "~src/modules";
import { StackFrameArg } from "~src/modules/types";
import { checkAndExpandMemoryIfNeeded } from "~src/modules/util";

/**
 * For a call of a function ptr from the JS runtime, handles:
 * 1. Instantiation of the stack frame for the function call
 * 2. Calling of the function
 * 3. Teardown of the function stack frame
 */
export default function wrapFunctionPtrCall(
  memory: WebAssembly.Memory,
  functionTable: WebAssembly.Table,
  functionPtr: number,
  sharedWasmGlobalVariables: SharedWasmGlobalVariables,
  stackFrameArgs: StackFrameArg[],
  returnTypes: ScalarCDataType[] // data type of the returns of the function
): (number | bigint)[] {
  const sizeOfReturns = returnTypes.reduce(
    (prv, curr) => prv + getSizeOfScalarDataType(curr),
    0
  );
  // instantiate stack frame
  const stackFrameSize = loadStackFrame(
    memory,
    sharedWasmGlobalVariables,
    stackFrameArgs,
    sizeOfReturns
  );

  // call the function pointed to be functionPtr
  functionTable.get(functionPtr)();

  const stackFrameReturnObjectView = new DataView(
    memory.buffer,
    sharedWasmGlobalVariables.basePointer.value + WASM_ADDR_SIZE,
    sizeOfReturns
  );

  const returnValues: (number | bigint)[] = [];
  let currOffset = 0;
  for (const returnType of returnTypes) {
    switch (returnType) {
      case "double":
        returnValues.push(
          stackFrameReturnObjectView.getFloat64(currOffset, true)
        );
        break;
      case "float":
        returnValues.push(
          stackFrameReturnObjectView.getFloat32(currOffset, true)
        );
        break;
      case "signed char":
        returnValues.push(stackFrameReturnObjectView.getInt8(currOffset));
        break;
      case "unsigned char":
      case "pointer":
        returnValues.push(stackFrameReturnObjectView.getUint8(currOffset));
        break;
      case "signed short":
        returnValues.push(
          stackFrameReturnObjectView.getInt16(currOffset, true)
        );
        break;
      case "unsigned short":
        returnValues.push(
          stackFrameReturnObjectView.getUint16(currOffset, true)
        );
        break;
      case "signed int":
        returnValues.push(
          stackFrameReturnObjectView.getInt32(currOffset, true)
        );
        break;
      case "unsigned int":
        returnValues.push(
          stackFrameReturnObjectView.getUint32(currOffset, true)
        );
        break;
      case "signed long":
        returnValues.push(
          stackFrameReturnObjectView.getBigInt64(currOffset, true)
        );
        break;
      case "unsigned long":
        returnValues.push(
          stackFrameReturnObjectView.getBigUint64(currOffset, true)
        );
        break;
    }
    currOffset += getSizeOfScalarDataType(returnType);
  }
  // extract return value
  tearDownStackFrame(
    memory,
    stackFrameSize,
    sharedWasmGlobalVariables.stackPointer,
    sharedWasmGlobalVariables.basePointer
  );

  return returnValues;
}

function loadStackFrame(
  memory: WebAssembly.Memory,
  sharedWasmGlobalVariables: SharedWasmGlobalVariables,
  stackFrameArgs: StackFrameArg[],
  sizeOfReturn: number
): number {
  const totalArgsSize = stackFrameArgs.reduce(
    (prv, curr) => prv + getSizeOfScalarDataType(curr.type),
    0
  );
  const bytesNeeded = totalArgsSize + sizeOfReturn + WASM_ADDR_SIZE; // need to add base pointer
  checkAndExpandMemoryIfNeeded(memory, bytesNeeded, sharedWasmGlobalVariables);

  const stackFrameDataView = new DataView(
    memory.buffer,
    sharedWasmGlobalVariables.stackPointer.value - bytesNeeded,
    bytesNeeded
  );

  // fill in old bp
  stackFrameDataView.setUint32(
    totalArgsSize,
    sharedWasmGlobalVariables.basePointer.value,
    true //little endian
  );

  // fill in param values
  let currOffset = bytesNeeded - sizeOfReturn - WASM_ADDR_SIZE;
  for (const arg of stackFrameArgs) {
    currOffset -= getSizeOfScalarDataType(arg.type);
    switch (arg.type) {
      case "double":
        stackFrameDataView.setFloat64(currOffset, Number(arg.value), true);
        break;
      case "float":
        stackFrameDataView.setFloat32(currOffset, Number(arg.value), true);
        break;
      case "signed char":
        stackFrameDataView.setInt8(currOffset, Number(arg.value));
        break;
      case "unsigned char":
      case "pointer":
        stackFrameDataView.setUint8(currOffset, Number(arg.value));
        break;
      case "signed short":
        stackFrameDataView.setInt16(currOffset, Number(arg.value), true);
        break;
      case "unsigned short":
        stackFrameDataView.setUint16(currOffset, Number(arg.value), true);
        break;
      case "signed int":
        stackFrameDataView.setInt32(currOffset, Number(arg.value), true);
        break;
      case "unsigned int":
        stackFrameDataView.setUint32(currOffset, Number(arg.value), true);
        break;
      case "signed long":
        stackFrameDataView.setBigInt64(currOffset, BigInt(arg.value), true);
        break;
      case "unsigned long":
        stackFrameDataView.setBigUint64(currOffset, BigInt(arg.value), true);
        break;
    }
  }

  // set the value of bp
  sharedWasmGlobalVariables.basePointer.value =
    sharedWasmGlobalVariables.stackPointer.value -
    sizeOfReturn -
    WASM_ADDR_SIZE;
  // set the value of sp
  sharedWasmGlobalVariables.stackPointer.value =
    sharedWasmGlobalVariables.stackPointer.value - bytesNeeded;

  return bytesNeeded;
}

function tearDownStackFrame(
  memory: WebAssembly.Memory,
  stackFrameSize: number,
  stackPointer: WebAssembly.Global,
  basePointer: WebAssembly.Global
) {
  stackPointer.value += stackFrameSize;
  const dataView = new DataView(
    memory.buffer,
    basePointer.value,
    WASM_ADDR_SIZE
  );
  basePointer.value = dataView.getUint32(0, true);
}
