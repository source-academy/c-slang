import {
  Identifier,
  TypedCompoundStatement,
  TypedTranslationUnit,
} from "../ast/types";
import { Memory } from "../memory/memory";
import { Agenda, AgendaItem, isInstruction } from "./agenda";
import { Stash, StashItem } from "./stash";
import { instructionEvaluator, ASTNodeEvaluator } from "./evaluators";
import { RuntimeConfig } from "../config";
import { FunctionDesignator, RuntimeObject } from "./object";
import { SymbolTable } from "./symbolTable";
import { cloneDeep } from "lodash";
import { RuntimeStack, StackFrame } from "./stack";
import { Stack, roundUpM } from "../utils";
import { FunctionType, ObjectTypeInfo, shortInt } from "../typing/types";
import { BUILTIN_FUNCTIONS, BuiltinFunction } from "../builtins";
import { Heap, HeapEntry } from "./heap";
import {
  EffectiveTypeTable,
  EffectiveTypeTableEntry,
} from "./effectiveTypeTable";
import { InitializedTable } from "./initializedTable";

export type TextAndDataEntry = FunctionDesignator | RuntimeObject;

export type TextAndData = TextAndDataEntry[];

export const isFunctionDesignator = (
  i: TextAndDataEntry,
): i is FunctionDesignator => i instanceof FunctionDesignator;

export class RuntimeView {
  agenda: AgendaItem[];
  lvalueFlags: boolean[];
  stash: StashItem[];
  textAndData: TextAndData;
  stack: StackFrame[];
  stackMemUsage: number;
  blockScopes: Record<Identifier, number>[];
  fileScope: Record<Identifier, number>;
  memory: Memory;
  functions: [string, TypedCompoundStatement, FunctionType][];
  functionCalls: number[];
  rbpArr: number[];
  heap: Record<number, HeapEntry>;
  heapMemUsage: number;
  effectiveTypeTable: Record<number, EffectiveTypeTableEntry>;
  initTable: InitializedTable;
  stdout: string;

  constructor(rt: Runtime) {
    this.agenda = rt.agenda.getArr();
    this.lvalueFlags = rt.agenda.getLvalueFlags();
    this.stash = rt.stash.getArr();
    this.textAndData = cloneDeep(rt.textAndData);
    this.stack = rt.stack.getArr();
    this.stackMemUsage = rt.stack.memUsage;
    this.blockScopes = rt.symbolTable.getBlockScopes();
    this.fileScope = rt.symbolTable.getFileScope();
    this.memory = cloneDeep(rt.memory);
    this.functions = rt.getFunctions();
    this.functionCalls = rt.functionCalls.getArr();
    this.rbpArr = rt.stack.getRbpArr();
    this.rbpArr.push(rt.stack.rbp);
    this.heap = rt.heap.getAllocations();
    this.heapMemUsage = rt.heap.memUsage;
    this.effectiveTypeTable = rt.effectiveTypeTable.getTable();
    this.initTable = cloneDeep(rt.initTable);
    this.stdout = rt.stdout;
  }
}

export class Runtime {
  public readonly agenda: Agenda;
  public readonly stash: Stash;
  public readonly textAndData: TextAndData;
  public readonly symbolTable: SymbolTable;
  public readonly config: RuntimeConfig;
  public readonly effectiveTypeTable: EffectiveTypeTable;
  public readonly memory: Memory;
  public readonly stack: RuntimeStack;
  public readonly functionCalls: Stack<number>;
  public readonly heap: Heap;
  public readonly initTable: InitializedTable;

  private functions: [string, TypedCompoundStatement, FunctionType][];
  private builtinFunctions: BuiltinFunction[];
  private _exitCode: number | undefined;
  private _stdout: string;
  private _dataPtr: number;
  private _textPtr: number;

  public constructor(program: TypedTranslationUnit, config: RuntimeConfig) {
    this.agenda = new Agenda(program);
    this.stash = new Stash();
    this.textAndData = [];
    this.symbolTable = new SymbolTable();
    this.config = config;
    this.effectiveTypeTable = new EffectiveTypeTable();
    this.memory = new Memory(
      config.memory,
      this.effectiveTypeTable,
      config.UB.skipStrictAliasingCheck,
    );
    this.stack = new RuntimeStack(config.memory.stack.baseAddress);
    this.functionCalls = new Stack();
    this.heap = new Heap(
      config.memory.heap.baseAddress,
      config.memory.heap.baseAddress + config.memory.heap.size,
    );
    this.initTable = new InitializedTable();

    this.functions = [];
    this.builtinFunctions = [];
    this._exitCode = undefined;
    this._stdout = "";
    this._dataPtr = config.memory.data.baseAddress;
    this._textPtr = config.memory.text.baseAddress;

    for (const [identifier, f] of Object.entries(BUILTIN_FUNCTIONS)) {
      const address = this.allocateText(shortInt());
      const idx = this.addBuiltinFunction(f);
      this.effectiveTypeTable.add(address, shortInt());
      this.memory.setScalar(
        address,
        BigInt(-idx - 1),
        shortInt(),
        this.config.endianness,
        true,
        true,
      );
      this.symbolTable.addAddress(identifier, address);
    }
  }

  public next(): void {
    if (this.agenda.isEmpty()) throw new RangeError("agenda is empty");
    const isLvalue = this.agenda.topIsLvalue();
    const next = this.agenda.pop();
    if (isInstruction(next)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      instructionEvaluator[next.type](this, next as any);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ASTNodeEvaluator[next.type](this, next as any, isLvalue);
    }
  }

  public setExitCode(n: number) {
    this._exitCode = n;
  }

  public get exitCode() {
    return this._exitCode;
  }

  public appendToStdout(s: string) {
    this._stdout += s;
  }

  public get stdout() {
    return this._stdout;
  }

  public addFunction(
    identifier: string,
    body: TypedCompoundStatement,
    typeInfo: FunctionType,
  ): number {
    return this.functions.push([identifier, body, typeInfo]) - 1;
  }

  public addBuiltinFunction(i: BuiltinFunction): number {
    return this.builtinFunctions.push(i) - 1;
  }

  public getFunction(idx: number): [TypedCompoundStatement, FunctionType] {
    try {
      const i = this.functions[idx];
      return [i[1], i[2]];
    } catch (err) {
      throw "invalid function index " + idx + " provided";
    }
  }

  public getBuiltinFunction(idx: number): BuiltinFunction {
    try {
      return this.builtinFunctions[idx];
    } catch (err) {
      throw "invalid builtin function index " + idx + " provided";
    }
  }

  public getFunctions(): [string, TypedCompoundStatement, FunctionType][] {
    return cloneDeep(this.functions);
  }

  public allocateAndZeroData(t: ObjectTypeInfo): number {
    this._dataPtr = roundUpM(this._dataPtr, t.alignment);
    this.memory.setRepeatedByte(this._dataPtr, t.size, 0);
    const address = this._dataPtr;
    this._dataPtr += t.size;
    return address;
  }

  public allocateText(t: ObjectTypeInfo): number {
    this._textPtr = roundUpM(this._textPtr, t.alignment);
    const address = this._textPtr;
    this._textPtr += t.size;
    return address;
  }
}
