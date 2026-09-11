import { Identifier } from "../ast/types";
import { BUILTIN_FUNCTIONS } from "../builtins";
import {
  AggregateType,
  Structure,
  TypeInfo,
  isAggregateType,
  isStructure,
} from "./types";

const TAG_PREFIX = "tag::";

export class TypeEnv {
  private env: Record<Identifier, [TypeInfo, boolean]>[];
  public readonly aggTypes: AggregateType[];
  private _inLoopBody: boolean;

  constructor() {
    this.env = [{}];
    this.aggTypes = [];
    this._inLoopBody = false;
    for (const [identifier, f] of Object.entries(BUILTIN_FUNCTIONS)) {
      this.addIdentifierTypeInfo(identifier, f.type);
    }
  }

  enterBlock(): void {
    this.env.push({});
  }

  exitBlock(): void {
    if (this.env.length === 1) throw new RangeError("no block to exit");
    this.env.pop();
  }

  enterLoopBody(): void {
    this._inLoopBody = true;
  }

  exitLoopBody(): void {
    this._inLoopBody = false;
  }

  get inLoopBody(): boolean {
    return this._inLoopBody;
  }

  getIdentifierTypeInfo(id: Identifier, isTypedef: boolean = false): TypeInfo {
    for (let i = this.env.length - 1; i >= 0; i--) {
      if (id in this.env[i]) {
        const [t, b] = this.env[i][id];
        if (isTypedef && !b) throw "identifier " + id + " does not name a type";
        if (!isTypedef && b) throw "identifier " + id + " is a typedef";
        return t;
      }
    }
    throw "identifier " + id + " not declared";
  }

  // see (6.2.3) Name spaces of identifiers
  getTagTypeInfo(tag: Identifier): Structure {
    const id = TAG_PREFIX + tag;
    for (let i = this.env.length - 1; i >= 0; i--) {
      if (id in this.env[i]) {
        const t = this.env[i][id][0];
        if (!isStructure(t)) {
          throw "tag " + tag + " does not refer to a structure";
        }
        return t;
      }
    }
    throw "tag " + tag + " not declared";
  }

  getAllTagsInCurrentScope() {
    const currScope = this.env[this.env.length - 1];
    const res: { tag: Identifier; struct: Structure }[] = [];
    Object.entries(currScope).forEach(([k, v]) => {
      if (k.startsWith(TAG_PREFIX)) {
        const tag = k.replace(TAG_PREFIX, "");
        if (!isStructure(v[0]))
          throw "tag " + tag + " does not refer to a structure";
        res.push({ tag, struct: v[0] });
      }
    });
    return res;
  }

  addIdentifierTypeInfo(
    id: Identifier,
    t: TypeInfo,
    isTypedef: boolean = false,
  ): void {
    const currBlock = this.env[this.env.length - 1];
    if (id in currBlock) throw "redeclaration of identifier " + id;
    if (isAggregateType(t)) this.aggTypes.push(t);
    currBlock[id] = [t, isTypedef];
  }

  addTagTypeInfo(tag: Identifier, t: Structure): void {
    const currBlock = this.env[this.env.length - 1];
    const id = TAG_PREFIX + tag;
    if (id in currBlock) throw "redeclaration of tag " + tag;
    if (isAggregateType(t)) this.aggTypes.push(t);
    currBlock[id] = [t, false];
  }
}
