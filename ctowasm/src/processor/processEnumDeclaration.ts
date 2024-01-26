import { ProcessingError } from "~src/errors";
import { EnumDeclaration } from "~src/parser/c-ast/declaration";
import { StatementP } from "~src/processor/c-ast/core";
import evaluateCompileTimeExpression from "~src/processor/evaluateCompileTimeExpression";
import { SymbolTable } from "~src/processor/symbolTable";

export default function processEnumDeclaration(enumDeclaration: EnumDeclaration, symbolTable: SymbolTable) {
  let currValue = 0n;
  enumDeclaration.enumerators.forEach(enumerator => {
    if (typeof enumerator.value !== "undefined" && enumerator.value !== null) {
      const value = evaluateCompileTimeExpression(enumerator.value).value;
      if (typeof value !== "bigint") {
        throw new ProcessingError(`Enumerator valuer for '${enumerator.name}' is not an integer constant`)
      }
    }
    symbolTable.addEnumeratorEntry(enumerator.name, currValue++);
  })
}