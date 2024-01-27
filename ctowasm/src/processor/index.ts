/**
 * C AST Processor Module.
 */

import { CAstRoot } from "~src/parser/c-ast/core";
import { FunctionDataType } from "~src/parser/c-ast/dataTypes";
import { CAstRootP } from "~src/processor/c-ast/core";
import processFunctionDefinition from "~src/processor/processFunctionDefinition";
import {
  processGlobalScopeDeclaration,
  unpackDataSegmentInitializerAccordingToDataType,
} from "~src/processor/processDeclaration";
import { SymbolTable } from "~src/processor/symbolTable";

/**
 * Processes the C AST tree generated by parsing, to add additional needed information for certain nodes.
 * @param ast
 * @param sourceCode
 * @returns
 */
export default function process(
  ast: CAstRoot,
  externalFunctions?: Record<string, FunctionDataType>,
) {
  const symbolTable = new SymbolTable();
  const processedExternalFunctions = symbolTable.setExternalFunctions(
    externalFunctions ?? {},
  );
  const processedAst: CAstRootP = {
    type: "Root",
    functions: [],
    dataSegmentByteStr: "",
    dataSegmentSizeInBytes: 0,
    externalFunctions: {},
  };

  // save the processed details of external functions
  for (const externalFuncName in processedExternalFunctions) {
    processedAst.externalFunctions[externalFuncName] = {
      name: externalFuncName,
      parameters:
        processedExternalFunctions[externalFuncName].processedFunctionDetails
          .parameters,
      returnObjects:
        processedExternalFunctions[externalFuncName].processedFunctionDetails
          .returnObjects,
    };
  }

  ast.children.forEach((child) => {
    // special handling for function definitions
    if (child.type === "FunctionDefinition") {
      processedAst.functions.push(
        processFunctionDefinition(child, symbolTable),
      );
    } else {
      processedAst.dataSegmentByteStr += processGlobalScopeDeclaration(
        child,
        symbolTable,
      ); // add the byte str used to initalize this variable to teh data segment byte string
    }
  });
  const BYTE_STR_LENGTH = 3; // each byte is represented in the byte string with 3 characters eg "\\00" for 0x00
  // at this point the dataSegmentOffset in the symbolTable will account for static local variables as well
  symbolTable.staticVariables.forEach(({ declaration, offset }) => {
    // insert the static variable byte strings at correct points in byte string using the offset
    processedAst.dataSegmentByteStr =
      processedAst.dataSegmentByteStr.slice(0, offset * BYTE_STR_LENGTH) +
      unpackDataSegmentInitializerAccordingToDataType(
        declaration.dataType,
        typeof declaration.initializer === "undefined"
          ? null
          : declaration.initializer,
      ) +
      processedAst.dataSegmentByteStr.slice(offset * BYTE_STR_LENGTH);
  });

  processedAst.dataSegmentSizeInBytes = symbolTable.dataSegmentOffset.value;
  return processedAst;
}
