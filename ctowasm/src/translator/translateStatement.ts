import { TranslationError } from "~src/errors";
import { StatementP } from "~src/processor/c-ast/core";
import translateExpression from "~src/translator/translateExpression";
import translateFunctionCall from "~src/translator/translateFunctionCall";
import { createWasmBooleanExpression } from "~src/translator/util";
import { WasmStatement } from "~src/translator/wasm-ast/core";
import {
  EnclosingLoopDetails,
  createEnclosingLoopDetails,
  generateBlockLabel,
  generateLoopLabel,
} from "~src/translator/loopUtil";
import { convertScalarDataTypeToWasmType } from "~src/translator/dataTypeUtil";
import { getSizeOfScalarDataType } from "~src/common/utils";
import { FUNCTION_BLOCK_LABEL } from "~src/translator/constants";
import translateSwitchStatement from "~src/translator/translateSwitchStatement";

/**
 * Visitor function for visting StatementP nodes and translating them to statements to add to enclosingBody.
 * @param statement node being visited.
 * @returns the translated wasm statements
 */
export default function translateStatement(
  statement: StatementP,
  enclosingLoopDetails?: EnclosingLoopDetails, // the loop labelname of the loop enclosing this statement Used to translate break statements.
): WasmStatement {
  if (statement.type === "MemoryStore") {
    return {
      type: "MemoryStore",
      addr: translateExpression(
        statement.address,
        statement.address.dataType,
        enclosingLoopDetails,
      ),
      value: translateExpression(
        statement.value,
        statement.dataType,
        enclosingLoopDetails,
      ),
      wasmDataType: convertScalarDataTypeToWasmType(statement.dataType),
      numOfBytes: getSizeOfScalarDataType(statement.dataType),
    };
  } else if (statement.type === "FunctionCall") {
    return translateFunctionCall(statement);
  } else if (statement.type === "SelectionStatement") {
    return {
      type: "SelectionStatement",
      condition: createWasmBooleanExpression(statement.condition),
      actions: statement.ifStatements.map((s) =>
        translateStatement(s, enclosingLoopDetails),
      ),
      elseStatements: statement.elseStatements
        ? statement.elseStatements.map((s) =>
            translateStatement(s, enclosingLoopDetails),
          )
        : [],
    };
  } else if (statement.type === "DoWhileLoop") {
    const newEnclosingLoopDetails =
      createEnclosingLoopDetails(enclosingLoopDetails);
    const loopLabel = generateLoopLabel(newEnclosingLoopDetails);
    const blockLabel = generateBlockLabel(newEnclosingLoopDetails);
    const body: WasmStatement[] = statement.body.map((s) =>
      translateStatement(s, newEnclosingLoopDetails),
    );

    body.push({
      type: "BranchIf",
      label: loopLabel,
      condition: createWasmBooleanExpression(statement.condition),
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
  } else if (statement.type === "WhileLoop") {
    const newEnclosingLoopDetails =
      createEnclosingLoopDetails(enclosingLoopDetails);
    const loopLabel = generateLoopLabel(newEnclosingLoopDetails);
    const blockLabel = generateBlockLabel(newEnclosingLoopDetails);
    const negatedCondition = createWasmBooleanExpression(
      statement.condition,
      true,
    );
    const body: WasmStatement[] = [];

    // branch out of the loop if the condition is not met
    body.push({
      type: "BranchIf",
      label: blockLabel,
      condition: negatedCondition,
    });

    statement.body.forEach((s) =>
      body.push(translateStatement(s, newEnclosingLoopDetails)),
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
    const newEnclosingLoopDetails =
      createEnclosingLoopDetails(enclosingLoopDetails);
    const loopLabel = generateLoopLabel(newEnclosingLoopDetails);
    const blockLabel = generateBlockLabel(newEnclosingLoopDetails);
    const negatedCondition =
      statement.condition !== null
        ? createWasmBooleanExpression(statement.condition, true)
        : null;
    const loopBody: WasmStatement[] = [];

    if (negatedCondition !== null) {
      loopBody.push({
        type: "BranchIf",
        label: blockLabel,
        condition: negatedCondition,
      });
    }

    // add for loop body
    statement.body.forEach((s) =>
      loopBody.push(translateStatement(s, newEnclosingLoopDetails)),
    );

    // add the for loop update expression
    statement.update.forEach((s) =>
      loopBody.push(translateStatement(s, newEnclosingLoopDetails)),
    );

    // add the branching statement at end of loop body
    loopBody.push({
      type: "Branch",
      label: loopLabel,
    });

    const blockBody: WasmStatement[] = [];
    // push on the clause statements
    statement.clause.forEach((s) =>
      blockBody.push(translateStatement(s, newEnclosingLoopDetails)),
    );

    blockBody.push({
      type: "Loop",
      label: loopLabel,
      body: loopBody,
    });

    return {
      type: "Block",
      label: blockLabel,
      body: blockBody,
    };
  } else if (statement.type === "ReturnStatement") {
    // branch out of the block holding the function body
    return {
      type: "Branch",
      label: FUNCTION_BLOCK_LABEL,
    };
  } else if (statement.type === "BreakStatement") {
    if (typeof enclosingLoopDetails === "undefined") {
      throw new TranslationError(
        "Break statement cannot be present outside a loop or switch body",
      );
    }
    return {
      type: "Branch",
      label: generateBlockLabel(enclosingLoopDetails),
    };
  } else if (statement.type === "ContinueStatement") {
    if (typeof enclosingLoopDetails === "undefined") {
      throw new TranslationError(
        "Continue statement cannot be present outside a loop body",
      );
    }
    return {
      type: "Branch",
      label: generateLoopLabel(enclosingLoopDetails),
    };
  } else if (statement.type === "SwitchStatement") {
    // psuedo-register 2 is used for holding the switch block index
    return translateSwitchStatement(statement);
  } else {
    throw new TranslationError("Unhandled statement");
  }
}
