import {
  Identifier,
  TypedBlockItem,
  TypedCompoundStatement,
  TypedInitDeclarator,
  isTypedCompoundStatement,
  isTypedDeclaration,
  isTypedIterationStatement,
  isTypedIterationStatementFor,
  isTypedLabeledStatementCase,
  isTypedLabeledStatementDefault,
  isTypedSelectionStatementIf,
  isTypedSelectionStatementSwitch,
  isTypedefDeclaration,
} from "../ast/types";
import { ObjectTypeInfo, ParameterTypeAndIdentifier } from "../typing/types";
import { Stack, roundUpM } from "../utils";
import { StackOverflowError } from "../memory/errors";

export type StackFrame = Record<
  Identifier,
  {
    address: number;
    typeInfo: ObjectTypeInfo;
  }
>;

export class RuntimeStack extends Stack<StackFrame> {
  private _rbp: number;
  private _rsp: number;
  private _rbpStack: Stack<number>;
  private _rspStack: Stack<number>;
  private _memUsage: number;
  private readonly stackSize: number;
  private depth: number;

  constructor(stackBaseAddress: number, stackSize: number) {
    super();
    this._rbp = stackBaseAddress;
    this._rsp = stackBaseAddress;
    this._rbpStack = new Stack();
    this._rspStack = new Stack();
    this._memUsage = 0;
    this.stackSize = stackSize;
    this.depth = 0;
  }

  getRbpArr(): number[] {
    return this._rbpStack.getArr();
  }

  // Checked before any state is mutated, so a failed push leaves the stack
  // exactly as it was (B3.1) - otherwise a function recursing without ever
  // touching a local variable would grow _rsp forever with no fault.
  override push(x: StackFrame, label?: string): void {
    const [size, alignment] = RuntimeStack.getStackFrameSizeAndAlignment(x);
    const prospectiveRbp = roundUpM(this._rsp + 1, alignment);
    const prospectiveUsage = this._memUsage + size;
    if (prospectiveUsage > this.stackSize) {
      const where = label ? ` (recursing into '${label}')` : "";
      throw new StackOverflowError(
        `exceeded the configured ${this.stackSize}-byte stack at depth ${this.depth}${where}`,
      );
    }

    this._rbpStack.push(this._rbp);
    this._rspStack.push(this._rsp);
    super.push(x);

    this._rbp = prospectiveRbp;
    this._rsp = this._rbp + size - 1;
    this._memUsage = prospectiveUsage;
    this.depth++;
  }

  override pop(): StackFrame {
    this._rsp = this._rspStack.pop();
    this._rbp = this._rbpStack.pop();
    const sf = super.pop();
    const size = RuntimeStack.getStackFrameSizeAndAlignment(sf)[0];
    this._memUsage -= size;
    this.depth--;
    return sf;
  }

  get rbp(): number {
    return this._rbp;
  }

  get rsp(): number {
    return this._rsp;
  }

  get memUsage(): number {
    return this._memUsage;
  }

  static calculateStackFrame(
    params: ParameterTypeAndIdentifier[],
    body: TypedCompoundStatement,
  ): StackFrame {
    const res: StackFrame = {};
    let ptr = 0;

    for (const p of params) {
      if (!p.identifier) throw new Error("param missing identifier");
      ptr = roundUpM(ptr, p.type.alignment);
      res[p.identifier] = {
        address: ptr,
        typeInfo: p.type,
      };
      ptr += p.type.size;
    }

    const identifierPrefix: string[] = [];
    const scanDeclaratorList = (dl: TypedInitDeclarator[]) => {
      dl.forEach((j) => {
        const typeInfo = j.typeInfo;
        const qid =
          identifierPrefix.join("::") +
          (identifierPrefix.length ? "::" : "") +
          j.identifier;
        j.qualifiedIdentifier = qid;
        ptr = roundUpM(ptr, typeInfo.alignment);
        res[qid] = { address: ptr, typeInfo };
        ptr += typeInfo.size;
      });
    };
    const scan = (stmts: TypedCompoundStatement): void => {
      let blockNo = 0;
      const scanBlock = (b: TypedCompoundStatement) => {
        identifierPrefix.push("block" + blockNo);
        scan(b);
        identifierPrefix.pop();
        blockNo++;
      };
      // a case/default label is transparent for scanning purposes - it
      // wraps exactly one item, which gets scanned as if it were the
      // label's own position (stacked labels just recurse one more level)
      const scanItem = (i: TypedBlockItem): void => {
        if (isTypedDeclaration(i)) {
          scanDeclaratorList(i.declaratorList);
        } else if (!isTypedefDeclaration(i)) {
          if (isTypedCompoundStatement(i)) scanBlock(i);
          else if (
            isTypedLabeledStatementCase(i) ||
            isTypedLabeledStatementDefault(i)
          ) {
            scanItem(i.body);
          } else if (isTypedSelectionStatementIf(i)) {
            if (isTypedCompoundStatement(i.consequent)) scanBlock(i.consequent);
            if (i.alternative && isTypedCompoundStatement(i.alternative))
              scanBlock(i.alternative);
          } else if (isTypedSelectionStatementSwitch(i)) {
            scanBlock(i.body);
          } else if (isTypedIterationStatementFor(i)) {
            // the for-loop's own scope (6.8.5p5) claims one block slot,
            // covering init; body (if braced) nests one level deeper, same
            // as any other nested compound statement
            identifierPrefix.push("block" + blockNo);
            if (i.init !== null && i.init.type === "Declaration")
              scanDeclaratorList(i.init.declaratorList);
            if (isTypedCompoundStatement(i.body)) scanBlock(i.body);
            identifierPrefix.pop();
            blockNo++;
          } else if (
            isTypedIterationStatement(i) &&
            isTypedCompoundStatement(i.body)
          )
            scanBlock(i.body);
        }
      };
      stmts.value.forEach(scanItem);
    };
    scan(body);

    return res;
  }

  static getStackFrameSizeAndAlignment(f: StackFrame): [number, number] {
    const size = Math.max(
      1,
      ...Object.values(f).map((i) => i.address + i.typeInfo.size),
    );
    const alignment = Math.max(
      1,
      ...Object.values(f).map((i) => i.typeInfo.alignment),
    );
    return [size, alignment];
  }
}
