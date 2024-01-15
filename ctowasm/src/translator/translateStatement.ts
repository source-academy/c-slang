import { WASM_ADDR_SIZE } from "~src/common/constants";
import { TranslationError } from "~src/errors";
import { ReturnStatement } from "~src/parser/c-ast/statement/jumpStatement";
import { StatementP } from "~src/processor/c-ast/core";
import {
  getRegisterPointerArithmeticNode,
  BASE_POINTER,
} from "~src/translator/memoryUtil";
import translateExpression from "~src/translator/translateExpression";
import translateFunctionCall from "~src/translator/translateFunctionCall";
import {
  createWasmBooleanExpression,
  wasmTypeToSize,
} from "~src/translator/util";
import { WasmSelectionStatement } from "~src/translator/wasm-ast/control";
import { WasmStatement } from "~src/translator/wasm-ast/core";
import { WasmBooleanExpression } from "./wasm-ast/expressions";
import {
  EnclosingLoopDetails,
  createEnclosingLoopDetails,
  generateBlockLabel,
  generateLoopLabel,
} from "~src/translator/loopUtil";
import { convertScalarDataTypeToWasmType } from "~src/translator/dataTypeUtil";
import { getSizeOfScalarDataType } from "~src/common/utils";

/**
 * Visitor function for visting StatementP nodes and translating them to statements to add to enclosingBody.
 * @param statement node being visited.
 * @returns the translated wasm statements
 */
export default function translateStatement(
  statement: StatementP,
  enclosingLoopDetails?: EnclosingLoopDetails // the loop labelname of the loop enclosing this statement Used to translate break statements.
): WasmStatement {
  if (statement.type === "MemoryStore") {
    return {
      type: "MemoryStore",
      addr: translateExpression(
        statement.address,
        statement.dataType,
        enclosingLoopDetails
      ),
      value: translateExpression(
        statement.value,
        statement.dataType,
        enclosingLoopDetails
      ),
      wasmDataType: convertScalarDataTypeToWasmType(statement.dataType),
      numOfBytes: getSizeOfScalarDataType(statement.value.dataType),
    };
  } else if (statement.type === "FunctionReturnMemoryStore") {
    return {
      type: "MemoryStore",
      addr: getRegisterPointerArithmeticNode(
        "bp",
        "+",
        WASM_ADDR_SIZE + Number(statement.offset.value)
      ),
      wasmDataType: convertScalarDataTypeToWasmType(statement.dataType),
      numOfBytes: getSizeOfScalarDataType(statement.dataType),
      value: translateExpression(
        statement.value,
        statement.dataType,
        enclosingLoopDetails
      ),
    };
  } else if (statement.type === "FunctionCall") {
    return translateFunctionCall(statement);
  } else if (statement.type === "SelectionStatement") {
    return {
      type: "SelectionStatement",
      condition: createWasmBooleanExpression(statement.condition),
      actions: statement.ifStatements.map((s) =>
        translateStatement(s, enclosingLoopDetails)
      ),
      elseStatements: statement.elseStatements
        ? statement.elseStatements.map((s) =>
            translateStatement(s, enclosingLoopDetails)
          )
        : null,
    };
  } else if (statement.type === "DoWhileLoop") {
    const loopLabel = generateLoopLabel(enclosingLoopDetails);
    const condition = createWasmBooleanExpression(statement.condition);
    const body: WasmStatement[] = statement.body.map((s) =>
      translateStatement(
        s,
        createEnclosingLoopDetails(condition, enclosingLoopDetails)
      )
    );

    // add the branching statement at end of loop body
    body.push({
      type: "BranchIf",
      label: loopLabel,
      condition: condition,
    });

    return {
      type: "Loop",
      label: loopLabel,
      body,
    };
  } else if (statement.type === "WhileLoop") {
    const blockLabel = generateBlockLabel(enclosingLoopDetails);
    const loopLabel = generateLoopLabel(enclosingLoopDetails);
    const condition = createWasmBooleanExpression(statement.condition);
    const body: WasmStatement[] = [];
    // add the branch if statement to start of loop body
    body.push({
      type: "BranchIf",
      label: blockLabel,
      condition: condition,
    });

    statement.body.forEach((s) =>
      body.push(
        translateStatement(
          s,
          createEnclosingLoopDetails(condition, enclosingLoopDetails)
        )
      )
    );
    // add the branching statement at end of loop body
    body.push({
      type: "Branch",
      label: loopLabel,
    });

    return {
      type: "Block",
      label: blockLabel,
      body: [
        {
          type: "Loop",
          label: loopLabel,
          body,
        },
      ],
    };
  } else if (statement.type === "ForLoop") {
    const blockLabel = generateBlockLabel(enclosingLoopDetails);
    const loopLabel = generateLoopLabel(enclosingLoopDetails);
    const condition = createWasmBooleanExpression(statement.condition);
    const body: WasmStatement[] = [];

    // add clause statements first
    statement.clause.forEach((s) =>
      body.push(
        translateStatement(
          s,
          createEnclosingLoopDetails(condition, enclosingLoopDetails)
        )
      )
    );

    // add condition check
    body.push({
      type: "BranchIf",
      label: blockLabel,
      condition: condition,
    });

    // add function body
    statement.body.forEach((s) =>
      translateStatement(
        s,
        createEnclosingLoopDetails(condition, enclosingLoopDetails)
      )
    );

    // add the for loop update expression
    statement.update.forEach((s) =>
      translateStatement(
        s,
        createEnclosingLoopDetails(condition, enclosingLoopDetails)
      )
    );

    // add the branching statement at end of loop body
    body.push({
      type: "Branch",
      label: loopLabel,
    });

    return {
      type: "Block",
      label: blockLabel,
      body: [
        {
          type: "Loop",
          label: loopLabel,
          body,
        },
      ],
    };
  } else if (statement.type === "ReturnStatement") {
    return {
      type: "ReturnStatement",
    };
  } else if (statement.type === "BreakStatement") {
    if (typeof enclosingLoopDetails === "undefined") {
      throw new TranslationError(
        "Break statement cannot be present outside a loop or switch body"
      );
    }
    return    {
        type: "Branch",
        label: generateBlockLabel(enclosingLoopDetails),
      }
    ;
  } else if (statement.type === "ContinueStatement") {
    if (typeof enclosingLoopDetails === "undefined") {
      throw new TranslationError(
        "Continue statement cannot be present outside a loop body"
      );
    }
    return  {
        type: "BranchIf",
        label: generateLoopLabel(enclosingLoopDetails),
        condition: enclosingLoopDetails.condition,
      }
  } else {
    throw new TranslationError("Unhandled statement");
  }
}
