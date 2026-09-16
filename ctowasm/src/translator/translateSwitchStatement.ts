import { SwitchStatementP } from "~src/processor/c-ast/statement/selectionStatement";
import {
  EnclosingLoopDetails,
  generateBlockLabel,
} from "~src/translator/loopUtil";
import translateStatement from "~src/translator/translateStatement";
import {
  createIntegerConst,
  createWasmBooleanExpression,
} from "~src/translator/util";
import { WasmBlock } from "~src/translator/wasm-ast/control";
import { WasmExpression, WasmStatement } from "~src/translator/wasm-ast/core";

export default function translateSwitchStatement(
  switchStatement: SwitchStatementP,
  enclosingLoopDetails?: EnclosingLoopDetails,
): WasmStatement {
  const numberOfBlocks =
    switchStatement.cases.length +
    (switchStatement.defaultStatements.length > 0 ? 1 : 0) +
    1; // add 1 for the additional inner block that holds the branch itself
  // construct the nested series of conditional expressions for getting correct index of block to jump to
  const defaultExpressionIndex = createIntegerConst(numberOfBlocks - 2, "i32"); // the default expression index
  let currExpression: WasmExpression = defaultExpressionIndex;
  for (let i = switchStatement.cases.length - 1; i >= 0; --i) {
    currExpression = {
      type: "ConditionalExpression",
      condition: createWasmBooleanExpression(
        switchStatement.cases[i].condition,
      ),
      trueExpression: createIntegerConst(i, "i32"),
      falseExpression: currExpression,
      wasmDataType: "i32",
    };
  }

  // start constructing the blocks
  const brTableBlock: WasmBlock = {
    type: "Block",
    label: `switch_block_0`,
    body: [
      {
        type: "BranchTable",
        maxIndex: numberOfBlocks - 2,
        indexExpression: currExpression,
      },
    ],
  };

  let newEnclosingLoopDetails: EnclosingLoopDetails;
  if (enclosingLoopDetails) {
    newEnclosingLoopDetails = {
      currBlockNumber: enclosingLoopDetails.currBlockNumber + 1,
      currLoopNumber: enclosingLoopDetails.currLoopNumber, // only increment the block number
    };
  } else {
    newEnclosingLoopDetails = {
      currBlockNumber: 0,
      currLoopNumber: 0,
    };
  }

  let currBlock: WasmBlock = brTableBlock;
  let i = 0;
  for (; i < switchStatement.cases.length; ++i) {
    currBlock = {
      type: "Block",
      label: `switch_block_${i + 1}`,
      body: [
        currBlock,
        ...switchStatement.cases[i].statements.map((statement) =>
          translateStatement(statement, newEnclosingLoopDetails),
        ),
      ],
    };
  }

  // add the last block for default case
  currBlock = {
    type: "Block",
    label: generateBlockLabel(newEnclosingLoopDetails), // any break statement wil break out of this block specifically
    body: [
      currBlock,
      ...switchStatement.defaultStatements.map((statement) =>
        translateStatement(statement, newEnclosingLoopDetails),
      ),
    ],
  };

  return currBlock;
}
