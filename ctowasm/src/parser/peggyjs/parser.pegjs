{
  const thisParser = this; // reference to the parser object itself (to get some variables)

  function getCurrPosition() {
    const loc = range();
    return {
      start: thisParser.tokenPositions.get(loc.start).start,
      end: thisParser.tokenPositions.get(Math.max(loc.start, loc.end - 1)).end
    }
  }
  
  function throwErrorWithLocation(message) {
    const e = new Error(message);
    e.location = location();
    throw e;
  }

  /**
   * Helper function to create and return a Node with position and type information
   */
  function generateNode(type, data) {
    return {
      type: type,
      position: getCurrPosition(),
      ...data,
    };
  }

  const C_Keywords = new Set([
    "auto",
    "extern",
    "break",
    "float",
    "case",
    "for",
    "char",
    "goto",
    "const",
    "if",
    "continue",
    "inline",
    "default",
    "int",
    "do",
    "long",
    "double",
    "register",
    "else",
    "restrict",
    "enum",
    "return",
    "short",
    "signed",
    "sizeof",
    "static",
    "struct",
    "switch",
    "typedef",
    "union",
    "unsigned",
    "void",
    "volatile",
    "while",
    "_Alignas",
    "_Alignof",
    "_Atomic",
    "_Bool",
    "_Complex",
    "_Generic",
    "_Imaginary",
    "_Noreturn",
    "_Static_assert",
    "_Thread_local",
  ]);

  const warnings = [];
  // add a warning to warnings
  function warn(message) {
    warnings.push({ message, position: getCurrPosition() });
  }

  // any non-syntax related compilation errors detected during parsing
  const compilationErrors = [];
  function error(message) {
    compilationErrors.push({ message, position: getCurrPosition() });
  }

  // this object is used to keep track of symbols, and identify whether they represent a variable/function or type (defined by struct/enum/typedef)
  // this is critical for identifying if an identifier is a typename defined by typedef or a variable -> needed for resolving "typedef ambiguity"
  // it is also used for resolving pointers to incomplete types (pointing to structs that are not yet defined)
  let symbolTable = {
    // 2 separate namespaces as per 6.2.3 of C17 standard
    identifiers: {}, // namespace for identifiers (regular variables/functions and types) // a symbol entry is defined as such: { type: "type" | "variable", dataType: DataType }
    tags: {}, // namespace for struct/enum tags // a symbol entry is defined as such: { type: "enum" | "struct", dataType: DataType }
  };

  function addIdentifierToSymbolTable(name, symbolEntry) {
    if (name in symbolTable.identifiers) {
      symbolTable.identifiers[name].push(symbolEntry);
    } else {
      symbolTable.identifiers[name] = [symbolEntry];
    }
    return { name, symbolEntry }; // returns details of the added symbol, to be removed at end of scope
  }

  function addTagToSymbolTable(name, symbolEntry) {
    if (name in symbolTable.tags) {
      symbolTable.tags[name].push(symbolEntry);
    } else {
      symbolTable.tags[name] = [symbolEntry];
    }
    return { name, symbolEntry }; // returns details of the added symbol, to be removed at end of scope
  }

  function isIdentifierAType(name) {
    if (!(name in symbolTable.identifiers) || symbolTable.identifiers[name].length <= 0) {
      return false;
    }
    const entries = symbolTable.identifiers[name];
    return entries[entries.length - 1].type === "type";
  }

  function isIdentifierDefined(name) {
    return name in symbolTable.identifiers && symbolTable.identifiers[name].length > 0;
  }

  function getIdentifierSymbolEntry(name) {
    if (!(name in symbolTable.identifiers) || symbolTable.identifiers[name].length <= 0) {
      throwErrorWithLocation(`'${name}' not declared`);
    }
    const entries = symbolTable.identifiers[name];
    return entries[entries.length - 1];
  }

  function isTagDefined(name) {
    return name in symbolTable.tags && symbolTable.tags[name].length > 0;
  }

  function getTagSymbolEntry(name) {
    if (!(name in symbolTable.tags) || symbolTable.tags[name].length <= 0) {
      throwErrorWithLocation(`'${name}' not declared`);
    }
    const entries = symbolTable.tags[name];
    return entries[entries.length - 1];
  }

  // pop off the latest symbol entry for a symbol (to be done at end of scopes)
  function removeIdentifierSymbolEntry(name) {
    if (!(name in symbolTable.identifiers) || symbolTable.identifiers[name].length <= 0) {
      throwErrorWithLocation(`'${name}' not declared`);
    }
    symbolTable.identifiers[name].pop();
  }

  function removeTagSymbolEntry(name) {
    if (!(name in symbolTable.tags) || symbolTable.tags[name].length <= 0) {
      throwErrorWithLocation(`'${name}' undeclared`);
    }
    return symbolTable.tags[name].pop();
  }

  /**
   *  Try to resolve the incomplete pointers given. Return whatever is still unresolved.
   */
  function resolveIncompletePointers(incompletePointers) {
    const unresolvedIncompletePointers = [];  
    for (const incompletePointer of incompletePointers) {
      if (isTagDefined(incompletePointer.pointeeType.tag)) {
        // incomplete pointee type was defined - now complete
        incompletePointer.pointeeType = getTagSymbolEntry(
          incompletePointer.pointeeType.tag
        ).dataType;
      } else {
        // incomplete pointee type still not defined
        unresolvedIncompletePointers.push(incompletePointer);
      }
    }
    return unresolvedIncompletePointers
  }

  /**
   * Remove the identifiers and tags that a given declaration created.
   * Also resolves incomplete pointers if the declaration resolves them. (declaration defines an incomplete type that a incomplete pointer points to)
   * Returns any remainig unresolved incomplete pointers.
   * 
   * Also checks for any redeclaration by checking if a given identifier/tag is removed more than once in the scope containing this declaration
   * @param removedTagsInScope object containing the tags that were removed in the scope containg this declaration mapped to the type of tag (struct or enum)
   * @param removedIdentifiersInScope
   */
  function removeDeclarationIdentifiersAndTags(declaration, existingIncompletePointers, removedTagsInScope, removedIdentifiersInScope, isRootScope) {
    let incompletePointers = existingIncompletePointers ?? [];
    if (declaration.incompletePointers) {
      // add the incomplete pointers from the declaration itself
      incompletePointers.push(...(declaration.incompletePointers));
    }

    incompletePointers = resolveIncompletePointers(incompletePointers);

    // remove identifiers
    for (const identifierDefinition of declaration.identifierDefinitions) {
      // check if identifiers were declared before
      if (identifierDefinition.name in removedIdentifiersInScope) {
        if (!(identifierDefinition.symbolEntry.type === "type" && removedIdentifiersInScope[identifierDefinition.name].type === "type") || JSON.stringify(identifierDefinition.symbolEntry.dataType) !== JSON.stringify(removedIdentifiersInScope[identifierDefinition.name].dataType)) {  
          // in all causes, unless the previous declaration was a typedef that declared as the same type, then there is a redeclaration error.
          if (isRootScope) {
            if (identifierDefinition.symbolEntry.type !== "variable" || removedIdentifiersInScope[identifierDefinition.name].type !== "variable" || JSON.stringify(identifierDefinition.symbolEntry.dataType) !== JSON.stringify(removedIdentifiersInScope[identifierDefinition.name].dataType)) {
              // in root scope it is allowed to have the 2 declarations with linkage (object/function) as long as they declare the same type
              error(`redeclaration of '${identifierDefinition.name}' with conflicting type`); 
            }
          } else {
            error(`redeclaration of '${identifierDefinition.name}'`);
          }  
        }
      }
      removedIdentifiersInScope[identifierDefinition.name] = identifierDefinition.symbolEntry;
      removeIdentifierSymbolEntry(identifierDefinition.name);
    }

    // remove tags
    if (declaration.tagDefinitions) {
      for (const tagDefinition of declaration.tagDefinitions) {
        if (tagDefinition.name in removedTagsInScope) {
          if (removedTagsInScope[tagDefinition.name].type === tagDefinition.symbolEntry.type) {
            // redefinition of enum / struct
            error(`redefinition of '${removedTagsInScope[tagDefinition.name].type} ${tagDefinition.name}'`);
          } else {
            if (removedTagsInScope[tagDefinition.name].type !== "incomplete" || removedTagsInScope[tagDefinition.name].subtype !== tagDefinition.symbolEntry.type) {
              // there is only an error is the previous tag was not incomplete or it was incomplete and its declaerd a different type of tag
              error(`redefinition of '${tagDefinition.name}' as wrong kind of tag`)
            }
          }
        }
        removeTagSymbolEntry(tagDefinition.name);
        removedTagsInScope[tagDefinition.name] = tagDefinition.symbolEntry.dataType;
      }
    }

    return incompletePointers;
  }

  function createBlockNode(statements) {
    // remove the declarations that were made in this block from the scope and unpack declarations
    const unpackedBlockStatements = [];
    let unresolvedIncompletePointers = [];
    const removedIdentifiers = {};
    const removedTags = {};
    for (const statement of statements) {
      const { unpackedStatements, incompletePointers } = unpackScopedStatement(statement, unresolvedIncompletePointers, removedTags, removedIdentifiers);
      unpackedBlockStatements.push(...unpackedStatements);
      unresolvedIncompletePointers = incompletePointers;
    }

    return generateNode("Block", {
      statements: unpackedBlockStatements,
      incompletePointers: unresolvedIncompletePointers,
    });
  }

  /**
   * Unpacks statements in a scope (block, switch scope).
   */
  function unpackScopedStatement(statement, unresolvedIncompletePointers, removedTags, removedIdentifiers) {
    const unpackedStatements = [];
    let incompletePointers = unresolvedIncompletePointers;
    if (statement === null) {
      // ignore null statements
    } else if (statement.type === "Declaration") {
      unpackedStatements.push(...(statement.declarations));
      // add any incompletepointers from the declaration
      incompletePointers = removeDeclarationIdentifiersAndTags(
        statement,
        incompletePointers,
        removedTags,
        removedIdentifiers
      );
    } else if (statement.type === "Block" || statement.type === "SwitchStatement") {
      // bring up all the incomplete pointers from the nested block
      incompletePointers.push(...(statement.incompletePointers));
      delete statement.incompletePointers;
      unpackedStatements.push(statement);
    } else {
      unpackedStatements.push(statement);
    }

    return { unpackedStatements, incompletePointers };
  }

  /**
   * Performs similarly to createBlockNode - has to remove any declared symbols 
   * as a new scope is defined in the switch statement block.
   */
  function createSwitchStatementNode(targetExpression, cases, defaultStatements) {
    const switchStatementNode = generateNode("SwitchStatement", {
      targetExpression: targetExpression,
      cases: [],
      defaultStatements: [],
      incompletePointers: []
    });
    const removedTags = {};
    const removedIdentifiers = {};
    for (const switchCase of cases) {
      const switchStatementCase = {
        type: "SwitchStatementCase",
        position: switchCase.position,
        conditionMatch: switchCase.conditionMatch,
        statements: []
      }
      for (const statement of switchCase.statements) {
        const { unpackedStatements, incompletePointers } = unpackScopedStatement(statement, switchStatementNode.incompletePointers, removedTags, removedIdentifiers);
        switchStatementCase.statements.push(...unpackedStatements);
        switchStatementNode.incompletePointers = incompletePointers;
      }
      switchStatementNode.cases.push(switchStatementCase);
    }
    for (const statement of defaultStatements) {
      const { unpackedStatements, incompletePointers } = unpackScopedStatement(statement, switchStatementNode.incompletePointers, removedTags, removedIdentifiers);
      switchStatementNode.defaultStatements.push(...unpackedStatements);
      switchStatementNode.incompletePointers = incompletePointers;
    }

    return switchStatementNode;
  }

  /**
   * Needed to handle ambiguity between identifier and keyword.
   */
  function isStringAKeyword(str) {
    return C_Keywords.has(str);
  }

  /**
   * Create a datatype that represents an incomplete type - a struct/enum that has not yet been defined, but has been referenced in a pointer.
   */
  function createIncompleteDataType(type, name) {
    return {
      type: "incomplete",
      subtype: type,
      tag: name,
    };
  }

  /**
   * Creates the Root node. Since Root node is created at the top of the parse tree, this function is run after the whole proram is parsed.
   * Thus any cleanup/extra logic that requires information which is only completely available after parsing can be done here.
   */
  function createRootNode(children) {
    const unpackedChildren = [];
    let unresolvedIncompletePointers = [];
    const removedTags = {};
    const removedIdentifiers = {};
    for (const child of children) {
      if (child.type === "Declaration") {
        unpackedChildren.push(...child.declarations);
        unresolvedIncompletePointers = removeDeclarationIdentifiersAndTags(
          child,
          unresolvedIncompletePointers,
          removedTags,
          removedIdentifiers,
          true
        );
      } else if (child.type === "FunctionDefinition") {
        if (child.incompletePointers) {
          unresolvedIncompletePointers.push(...(child.incompletePointers));
        }
        delete child.incompletePointers;
        unpackedChildren.push(child);
      } else {
        // shoudlnt happen
        error("Unknown child in root node");
      }
    }
    return generateNode("Root", { children: unpackedChildren });
  }

  function generateIntegerConstant(value, suffix) {
    let correctedSuffix;
    if (suffix.length > 0) {
      correctedSuffix = suffix.toLowerCase();
      if (correctedSuffix.includes("ll")) {
        // in this implementation long long and long are identical
        if (correctedSuffix.includes("u")) {
          correctedSuffix = "ul";
        } else {
          correctedSuffix = "l";
        }
      }
    } else {
      correctedSuffix = null;
    }

    return generateNode("IntegerConstant", {
      value: BigInt(value),
      suffix: correctedSuffix,
    });
  }

  function generateFloatConstant(value, suffix) {
    return generateNode("FloatConstant", {
      value: Number(value),
      suffix: suffix === "f" || suffix === "F" ? "f" : null,
    });
  }

  /**
   * Process declarations that do not have a declarator - i.e they should be declaring a struct/enum type.
   */
  function processDeclarationWithoutDeclarator(declarationSpecifiers) {
    const { enumDeclarations, tagDefinitions, storageClass, incompletePointers, hasTypeDefSpecifier, constPresent, noType } =
      unpackDeclarationSpecifiers(declarationSpecifiers, true);
    const identifierDefinitions = [];
    const declarations = [];
    
    // if no tags (struct or enum) were declared, then this violates 6.7/2 of C17 standard.
    if ((typeof tagDefinitions === "undefined" || tagDefinitions.length === 0)) {
      if (noType) {
        if (constPresent) {
          throwErrorWithLocation("useless type qualifier in empty declaration")
        }
        if (storageClass) {
          throwErrorWithLocation("useless storage class qualifier in empty declaration");
        }
      } else {
        throwErrorWithLocation("empty declaration")
      }
      return generateNode("Declaration", { declarations: [], identifierDefinitions: [] });
    }

    if (storageClass) {
      warn("useless storage class qualifier in empty declaration");
    }

    // add all enum variables that could have been defined in enum specifier
    if (typeof enumDeclarations !== "undefined") {
      enumDeclarations.forEach((enumDeclaration) => {
        enumDeclaration.enumerators.forEach((enumerator) => {
          identifierDefinitions.push(
            addIdentifierToSymbolTable(enumerator.name, {
              type: "variable",
              dataType: createPrimaryDataType("signed int"),
            })
          );
        });

        declarations.push(enumDeclaration);
      });
    }

    return generateNode("Declaration", {
      declarations,
      tagDefinitions,
      identifierDefinitions,
      incompletePointers,
    });
  }

  /**
   * Builds and returns a tree of binary operations which involves the 2 operaands (left and right expressions), and a operator
   * @param firstExpr first expression in the operation expression e.g. "2" in "2 + 3 + 4"
   * @param exprsWithOperatorArr an array of arrays of size 2 which contain an operator in first index and the expr in 2nd index. e.g: [["+", 3], ["+", 4]]
   */
  function createLeftToRightBinaryExpressionTree(
    firstExpr,
    exprsWithOperatorArr
  ) {
    let currNode = firstExpr;
    for (const operation of exprsWithOperatorArr) {
      // create a new operation node
      currNode = generateNode("BinaryExpression", {
        leftExpr: currNode,
        rightExpr: operation[1],
        operator: operation[0],
      });
    }
    return currNode;
  }

  function createUnaryExpressionNode(expr, operator) {
    // special handling for negated constants, just negate the value of constant
    if (
      operator === "-" &&
      (expr.type === "IntegerConstant" || expr.type === "FloatConstant")
    ) {
      return {
        ...expr,
        value: -expr.value,
      };
    }

    return generateNode("UnaryExpression", {
      operator,
      expression: expr,
    });
  }

  // Creates a PrimaryDataType object.
  function createPrimaryDataType(primaryDataType) {
    return {
      type: "primary",
      primaryDataType,
    };
  }

  function createEnumDataType(tag) {
    return {
      type: "enum",
      tag
    }
  }

  function createArrayDataType(elementDataType, numElements) {
    return {
      type: "array",
      elementDataType: elementDataType,
      numElements,
    };
  }

  function createInitializerList(values) {
    values = values ?? [];
    return generateNode("InitializerList", {
      values,
    });
  }

  function createInitializerSingle(value) {
    return generateNode("InitializerSingle", {
      value,
    });
  }

  // Evaluates the string of postfix expressions to generate a complete tree of unary expression nodes
  // Follows left to right associativity.
  function createPostfixExpressionNode(firstExpr, operations) {
    let currNode = firstExpr;
    for (const operation of operations) {
      if (operation.type === "ArrayElementExpr") {
        // array element expr are equivalent to pointer dereference expression A[B] => *(A + B)
        currNode = generateNode("PointerDereference", {
          expr: {
            type: "BinaryExpression",
            leftExpr: currNode,
            rightExpr: operation.index,
            operator: "+",
          },
        });
      } else if (operation.type === "StructPointerMemberAccess") {
        // similar to array element expr, a->x is equivalent to *a.x
        currNode = generateNode("StructMemberAccess", {
          expr: {
            type: "PointerDereference",
            expr: currNode,
          },
          fieldTag: operation.fieldTag,
        });
      } else {
        currNode = {
          ...operation,
          expr: currNode,
        };
      }
    }
    currNode.position = getCurrPosition();
    return currNode;
  }

  // Evaluates the string of prefix expressions to generate a complete tree of unary expression nodes
  // Follows right to left associativity
  // @param firstExpr refers to the rightmost expression
  function createPrefixExpressionNode(firstExpr, operations) {
    let currNode = firstExpr;
    for (let i = operations.length - 1; i >= 0; --i) {
      const { type, ...rest } = operations[i];
      currNode = generateNode(type, {
        ...rest,
        expr: currNode,
      });
    }
    return currNode;
  }

  function createAssignmentNode(lvalue, assignedExpression, assignmentOperator) {
    if (assignmentOperator.length > 1) {
      // compond assignment operator
      return generateNode("Assignment", {
          lvalue,
          expr: {
            type: "BinaryExpression",
            leftExpr: lvalue,
            rightExpr: assignedExpression,
            operator: assignmentOperator[0], // only take the first char of assignmentOperator e.g. "+" of "+="
          },
        }); 
    } else {
      return generateNode("Assignment", {
        lvalue,
        expr: assignedExpression
        }
      )
    }
  } 

  /**
   * Given an array of pointers ("*"), create a tree of PointerDeclarators, ending in the directDeclarator.
   */
  function createPointerDeclaratorNode(pointers, directDeclarator) {
    let currNode = directDeclarator;
    for (const pointer of pointers) {
      currNode = {
        type: "PointerDeclarator",
        isConst: pointer.isConst,
        directDeclarator: currNode,
      };
    }
    if (directDeclarator.functionDefinitionInfo) {
      currNode.functionDefinitionInfo = directDeclarator.functionDefinitionInfo; 
      delete directDeclarator.functionDefinitionInfo; 
    }
    return currNode;
  }

  function createFunctionDeclarator(parameterDeclarations) {
    if (typeof parameterDeclarations === "undefined") {
      return generateNode("FunctionDeclarator", {
        parameters: [],
        functionDefinitionInfo: {
          parameterNames: [],
          enumDeclarations: [],
          tagDefinitions: [],
          incompletePointers: [],
        }, // information that is only relevant to function definitions
      });
    }
    return generateNode("FunctionDeclarator", {
      parameters: parameterDeclarations.dataTypes,
      functionDefinitionInfo: {
        parameterNames: parameterDeclarations.names,
        enumDeclarations: parameterDeclarations.enumDeclarations,
        tagDefinitions: parameterDeclarations.tagDefinitions,
        incompletePointers: parameterDeclarations.incompletePointers,
      }, // information that is only relevant to function definitions
    });
  }

  // evaluate the delclarator suffixes of direct_declarator
  // this is used to evaluate declarators which have [] or () suffixes which indicate
  // that they are array or function suffixes respectively
  function evaluateDeclaratorSuffixes(directDeclarator, declaratorSuffixes) {
    let currNode = directDeclarator;
    for (const suffix of declaratorSuffixes) {
      // some error checking
      if (suffix.type === "FunctionDeclarator") {
        // you can only have string of consecutive array declarators
        if (currNode.type === "FunctionDeclarator") {
          error("Cannot have a function returning a function");
        }
        // you cannot have an array of functions
        if (currNode.type === "ArrayDeclarator") {
          error("Cannot have an array of functions");
        }
      } else {
        // suffix is "ArrayDeclarator"
        if (currNode.type === "FunctionDeclarator") {
          // cannot have a function returning array
          error("Cannot have a function returning an array");
        }
      }

      currNode = { directDeclarator: currNode, ...suffix };
    }
    return currNode;
  }

  /**
   * Unpack and process declaration specifiers
   * @returns { dataType: DataType | { type: "void" }, enumDeclarations?: { type: "EnumDeclaration", enumerators: { name: string, value?: Expression }[]}[], tagDefinition?: { name: string, dataType: DataType }, storageClass: "auto" | "static", hasTypeDefSpecifier: boolean, incompletePointers?: PointerDataType[]}
   */
  function unpackDeclarationSpecifiers(declarationSpecifiers, reportErrors = false) {
    const typeSpecifiers = [];
    let storageClass;
    let isConst = false; // only type qualifier that is supported
    let hasTypeDefSpecifier = false;

    function declarationSpecifierError(message) {
      if (reportErrors) {
        error(message)
      }
    }

    declarationSpecifiers.forEach((specifier) => {
      switch (specifier.type) {
        case "TypeSpecifier":
          typeSpecifiers.push(specifier.specifier);
          break;
        case "TypeQualifier":
          if (specifier.qualifier !== "const") {
            // should not happen
            declarationSpecifierError(`Unknown type qualifier '${specifier.qualifier}'`);
          }
          isConst = true;
          break;
        case "StorageClassSpecifier":
          if (storageClass) {
            // a storage class specifier already specified
            declarationSpecifierError(
              `multiple storage class specifiers: '${storageClass}' and '${specifier.specifier}'`
            );
          }
          if (hasTypeDefSpecifier) {
            declarationSpecifierError(`multiple storage class specifiers in declaration specifiers: 'typedef' and '${specifier.specifier}'`);
          }
          storageClass = specifier.specifier;
          break;
        case "TypeDefSpecifier":
          if (storageClass) {
            declarationSpecifierError(`multiple storage class specifiers in declaration specifiers: '${specifier.specifier}' and 'typedef'`);
          } 
          if (hasTypeDefSpecifier) {
            declarationSpecifierError("duplicate 'typedef'");
          }
          hasTypeDefSpecifier = true;
      }
    });

    if (typeSpecifiers.length < 1) {
      return { dataType: createPrimaryDataType("signed int"), noType: true, storageClass, constPresent: isConst }; // placeholder data type (other compilers would default to int, but full standard compliance means an error)
    }

    const { dataType, enumDeclarations, tagDefinitions, incompletePointers } =
      processTypeSpecifiers(typeSpecifiers);
    if (isConst) {
      dataType.isConst = true;
    }

    return {
      dataType,
      enumDeclarations,
      tagDefinitions,
      incompletePointers,
      storageClass,
      hasTypeDefSpecifier,
      constPresent: isConst // only used when processing declarations with no declarator
    };
  }

  /**
   * Processes a list of typeSpecifiers, to extract a dataType that they represent, as well as any enum variable definitions, and struct/enum type definitions
   * @returns { dataType: DataType | { type: "void" }, enumDeclarations?: { type: "EnumDeclaration" enumerators: { name: string, value?: Expression }[] }[], tagDefinitions?: { name: string, tagSymbolEntry: { type: "struct" | "enum", dataType: DataType} } }
   * dataType is the datatype indicated by the typespecifiers
   * enumDeclarations are any enum variables declared with the enum specifiers
   * tagDefinitions are any structs that are being
   */
  function processTypeSpecifiers(typeSpecifiers) {
    const firstTypeSpecifier = typeSpecifiers[0];
    if (
      firstTypeSpecifier.type === "StructTypeSpecifier" ||
      firstTypeSpecifier.type === "EnumTypeSpecifier" ||
      firstTypeSpecifier.type === "VoidTypeSpecifier" ||
      firstTypeSpecifier.type === "UserNamedTypeSpecifier"
    ) {
      if (typeSpecifiers.length > 1) {
        // cannot have any more specifiers
        error("Two or more data types in declaration specifiers");
      }
      if (firstTypeSpecifier.type === "StructTypeSpecifier") {
        const structSpecifier = firstTypeSpecifier.specifier;
        if (structSpecifier.type === "AnonymousStruct") {
          // a struct may have an enum declared within it
          return {
            dataType: structSpecifier.dataType,
            enumDeclarations: structSpecifier.enumDeclarations,
            tagDefinitions: structSpecifier.tagDefinitions,
            incompletePointers: structSpecifier.incompletePointers,
          };
        } else if (structSpecifier.type === "NamedStructDefinition") {
          // within the struct there may have been more struct/enum tags defined
          // tag has already been added within createStructSpecifier()
          return {
            dataType: structSpecifier.dataType,
            tagDefinitions: structSpecifier.tagDefinitions,
            enumDeclarations: structSpecifier.enumDeclarations,
            incompletePointers: structSpecifier.incompletePointers,
          };
        } else if (structSpecifier.type === "NamedStructReference") {
          // retrieve type from symbol table if it exists and was also a struct
          if (isTagDefined(structSpecifier.tag) && getTagSymbolEntry(structSpecifier.tag).type === "struct") {
            const symbolEntry = getTagSymbolEntry(structSpecifier.tag);
            return { dataType: symbolEntry.dataType };
          } else {
            const incompleteType = createIncompleteDataType(
                "struct",
                structSpecifier.tag
              );
            const symbolEntry = { type: "struct", dataType: incompleteType }
            const tagDefinition = addTagToSymbolTable(structSpecifier.tag, symbolEntry)
            return {
              dataType: incompleteType,
              tagDefinitions: [
                tagDefinition
              ],
            }; // incomplete type for now, to be resolved later when struct is defined
          }
        }
      } else if (firstTypeSpecifier.type === "EnumTypeSpecifier") {
        const enumSpecifier = firstTypeSpecifier.specifier;
        if (enumSpecifier.type === "NamedDefinedEnum") {
          // a new enum has been defined
          const newTagSymbolEntry = {
            type: "enum",
            dataType: createEnumDataType(enumSpecifier.tag),
          };
          addTagToSymbolTable(enumSpecifier.tag, newTagSymbolEntry);
          enumSpecifier.enumerators.forEach((enumerator) => {
            addIdentifierToSymbolTable(enumerator.name, {
              type: "variable",
              dataType: createEnumDataType(enumSpecifier.tag),
            });
          });
          return {
            dataType: createEnumDataType(enumSpecifier.tag),
            enumDeclarations: [
              { type: "EnumDeclaration", enumerators: enumSpecifier.enumerators },
            ],
            tagDefinitions: [
              { name: enumSpecifier.tag, symbolEntry: newTagSymbolEntry },
            ],
          }; // all enums defined as having signed int type
        } else if (enumSpecifier.type === "AnonymousEnum") {
          enumSpecifier.enumerators.forEach((enumerator) => {
            addIdentifierToSymbolTable(enumerator.name, {
              type: "variable",
              dataType: createEnumDataType(enumSpecifier.tag),
            });
          });
          return {
            dataType: createEnumDataType(null),
            enumDeclarations: [
              { type: "EnumDeclaration", enumerators: enumSpecifier.enumerators },
            ],
          };
        } else if (enumSpecifier.type === "NamedEnumReference") {
          if (isTagDefined(enumSpecifier.tag) && getTagSymbolEntry(enumSpecifier.tag).type === "enum") {
            const symbolEntry = getTagSymbolEntry(enumSpecifier.tag);
            return { dataType: symbolEntry.dataType };
          } else {
            const incompleteType = createIncompleteDataType(
                "enum",
                enumSpecifier.tag
              );
            const symbolEntry = { type: "enum", dataType: incompleteType }
            const tagDefinition = addTagToSymbolTable(enumSpecifier.tag, symbolEntry)
            return { dataType: incompleteType, tagDefinitions: [ tagDefinition ] };
          }
        }
      } else if (firstTypeSpecifier.type === "VoidTypeSpecifier") {
        return { dataType: { type: "void" } };
      } else if (firstTypeSpecifier.type === "UserNamedTypeSpecifier") {
        if (!isIdentifierAType(firstTypeSpecifier.typeName)) {
          error(`undeclared type '${firstTypeSpecifier.typeName}'`);
        }
        return {
          dataType: getIdentifierSymbolEntry(firstTypeSpecifier.typeName)
            .dataType,
        };
      }
    } else if (firstTypeSpecifier.type === "UnknownTypeSpecifier") {
      throwErrorWithLocation(`unknown type name '${firstTypeSpecifier.typeName}'`);
    } else {
      // only dealing with primary data types now
      let lengthSpecifier;
      let intSignSpecifier;
      let primaryDataTypeSpecifier;
      for (const specifier of typeSpecifiers) {
        if (specifier.type === "PrimaryTypeSpecifier") {
          if (primaryDataTypeSpecifier) {
            // error if primary data type already given
            error("Two or more data types in declaration specifiers");
          }
          primaryDataTypeSpecifier = specifier.specifier;
        } else if (specifier.type === "PrimaryDataTypeLengthSpecifier") {
          if (lengthSpecifier) {
            error(
              `Both '${lengthSpecifier}' and '${specifier.specifier}' in declaration specifiers`
            );
          }
          lengthSpecifier = specifier.specifier;
        } else if (specifier.type === "IntegerSignSpecifier") {
          if (intSignSpecifier) {
            error(
              `Both '${intSignSpecifier}' and '${specifier.specifier}' in declaration specifiers`
            );
          }
          intSignSpecifier = specifier.specifier;
        }
      }

      if (!primaryDataTypeSpecifier && !lengthSpecifier && !intSpecifier) {
        error("type specifier required in declaration specifiers");
      }

      if (
        primaryDataTypeSpecifier === "float" ||
        primaryDataTypeSpecifier === "double"
      ) {
        if (intSignSpecifier) {
          error(
            `Both '${intSignSpecifier}' and '${primaryDataTypeSpecifier}' in declaration specifiers`
          );
        }
        return { dataType: createPrimaryDataType(primaryDataTypeSpecifier) };
      } else if (primaryDataTypeSpecifier === "char") {
        const intSignPrefix = intSignSpecifier ? intSignSpecifier + " " : "signed "; // integral types are signed by default
        if (lengthSpecifier) {
          error(
            `Both '${lengthSpecifier}' and '${primaryDataTypeSpecifier}' in declaration specifiers`
          );
        }
        return { dataType: createPrimaryDataType(intSignPrefix + "char") };
      } else {
        // default primary data type is int
        const intSignPrefix = intSignSpecifier ? intSignSpecifier + " " : "signed "; // integral types are signed by default
        if (lengthSpecifier) {
          return {
            dataType: createPrimaryDataType(intSignPrefix + lengthSpecifier),
          };
        } else {
          // just int
          return { dataType: createPrimaryDataType(intSignPrefix + "int") };
        }
      }
    }
  }

  // Unpacks a series of { declarations: Declaration, incompletePointers: PointerDataType } objects into
  // one singular object { declarations: Declaration, incompletePointers: PointerDataType }
  function unpackDeclarations(declarations) {
    const unpackedResult = {
      declarations: [],
      incompletePointers: [],
    };

    declarations.forEach(({ declarations, incompletePointers }) => {
      unpackedResult.declarations.push(...declarations);
      unpackedResult.incompletePointers.push(...incompletePointers);
    });
    return unpackedResult;
  }

  // Similar to unpackDeclarations, with enumDeclarations and tagDefinitions also being unpacked
  function unpackStructDeclarations(declarations) {
    const unpackedResult = {
      declarations: [],
      incompletePointers: [],
      enumDeclarations: [], // all the enum variables declarad within the struct
      tagDefinitions: [], // all the structs/enums declared within the struct
    };

    declarations.forEach(
      ({
        declarations,
        incompletePointers,
        enumDeclarations,
        tagDefinitions,
      }) => {
        unpackedResult.declarations.push(...declarations);
        if (incompletePointers) {
          unpackedResult.incompletePointers.push(...incompletePointers);
        }
        if (enumDeclarations) {
          unpackedResult.enumDeclarations.push(...enumDeclarations);
        }
        if (tagDefinitions) {
          unpackedResult.tagDefinitions.push(...tagDefinitions);
        }
      }
    );
    return unpackedResult;
  }

  /**
   * Called after a new struct is declared.
   * @returns { dataType: StructDataType, incompletePointers: PointerDataType[], enumDeclarations: { type: "EnumeratorDeclaration", enumerators: { name: string, value: number}[]}[], tagDefinitions }
   * 
   */
  function createStructSpecifier(unpackedFieldDeclarations, tag) {
    const structDataType = {
      type: "struct",
      tag,
      fields: [],
    };

    // add the declarations of each field to the struct
    if (unpackedFieldDeclarations.declarations) {
      unpackedFieldDeclarations.declarations.forEach((declaration) => {
        structDataType.fields.push({
          tag: declaration.name,
          dataType: declaration.dataType,
        });
      });
    }

    // resolve all incomplete pointers which can be resolved
    const incompletePointers = [];
    unpackedFieldDeclarations.incompletePointers.forEach((incompletePointer) => {
      const pointeeTag = incompletePointer.pointeeType.tag;
      const tagType = incompletePointer.pointeeType.subtype;
      if (pointeeTag === tag) {
        // this is a pointer that points to the struct it is within
        if (tagType !== "struct") {
          error(`'${pointeeTag}' declared as wrong kind of tag`);
        }
        delete incompletePointer.pointeeType;
        incompletePointer.type = "struct self pointer";
      } else {
        if (isTagDefined(pointeeTag)) {
          const symbolEntry = getTagSymbolEntry(pointeeTag);
          if (symbolEntry.type !== tagType) {
            error(`'${pointeeTag}' declared as wrong kind of tag`);
          }
          // incomplete pointer is now complete (pointing to complete type)
          incompletePointer.pointeeType = symbolEntry.dataType;
        } else {
          // still incomplete
          incompletePointers.push(incompletePointer.pointeeType);
        }
      }
    });

    // add this new struct (if named) thats been declared to the tagDefinitions & symboltable
    const tagDefinitions = unpackedFieldDeclarations.tagDefinitions ?? [];
    if (tag) {
      const symbolEntry = { type: "struct", dataType: structDataType };
      const tagDefinition = addTagToSymbolTable(tag, symbolEntry);
      tagDefinitions.push(tagDefinition);
    }

    return {
      dataType: structDataType,
      incompletePointers,
      enumDeclarations: unpackedFieldDeclarations.enumDeclarations,
      tagDefinitions,
    };
  }

  function createEmptyStructSpecifier(tag) {
    error("struct has no members");
    return {
      dataType: {
        type: "struct",
        tag,
        fields: [], 
      },
      incompletePointers: [],
      enumDeclarations: [],
      tagDefinitions: [],
    }; 
  }

  // Recursively traverses a tree of declarators to create a DataType object and extract the name of the symbol with this dataType,
  // returning the object with type: { name: string, dataType: DataType, incompletePointer?: PointerDataType }
  // this function is able to evaluate declarators used in function declarations that do not have a symbol as well.
  // optionally takes a param @isFunctionParam that indicates that this declarator is used in a function parameter
  function convertDeclaratorIntoDataTypeAndSymbolName(
    declarator,
    typeSpecifierDataType,
    isFunctionParam
  ) {
    const result = { functionDefinitionInfo: declarator.functionDefinitionInfo };
    let currNode = result;
    // helper function to add datatype to currNode
    function addDataType(dataTypeToAdd) {
      // only pointers and functions can have null type specifier - void type
      if (dataTypeToAdd.type === "void") {
        if (typeof currNode.type === "undefined" || currNode.type === "primary") {
          error(`Variable or field declared as void`);
        } else if (currNode.type === "array") {
          error(`Declaration of array of void type`);
        } 
      }
      if (currNode.type === "array") {
        currNode.elementDataType = dataTypeToAdd;
      } else if (currNode.type === "pointer") {
        currNode.pointeeType = dataTypeToAdd;
      } else if (currNode.type === "function") {
        currNode.returnType = dataTypeToAdd;
      } else {
        currNode.dataType = dataTypeToAdd;
      }
    }

    function recursiveHelper(declarator) {
      if (declarator.type === "SymbolDeclarator") {
        // all non-abstract declarations will end with a symbol (based on parsing rules)
        result.name = declarator.symbolName;
        return;
      } else if (declarator.type === "AbstractDeclarator") {
        // recursive tail of symboless declaration that can only be used in function declarations
        result.name = null;
        return;
      } else {
        // all other declarators require more traversal
        recursiveHelper(declarator.directDeclarator);
      }

      if (declarator.type === "PointerDeclarator") {
        const pointerType = {
          type: "pointer",
          isConst: declarator.isConst,
        };
        addDataType(pointerType);
        currNode = pointerType;
      } else if (declarator.type === "FunctionDeclarator") {
        const functionType = {
          type: "function",
          parameters: declarator.parameters,
          parameterNames: declarator.parameterNames,
        };
        // some error checks
        if (currNode.type === "FunctionDeclarator") {
          error("Cannot declare a function returning a function");
        } else if (currNode.type === "ArrayDeclarator") {
          error("Cannot declare an array of functions");
        }

        addDataType(functionType);
        currNode = functionType;
      } else if (declarator.type === "ArrayDeclarator") {
        const arrayType = {
          type: "array",
          numElements: declarator.numElements,
        };

        if (currNode.type === "FunctionDeclarator") {
          error("Cannot declare a function returning an array");
        }

        addDataType(arrayType);
        currNode = arrayType;
      } else {
        error("Unknown declarator type");
      }
    }

    recursiveHelper(declarator);

    // Only pointers can point to incomplete types
    if (typeSpecifierDataType.type === "incomplete") {
      if (currNode.type !== "pointer") {
        error(`'${typeSpecifierDataType.tag}' is an incomplete type`);
      } else {
        // keep track that this pointer datatype as incomplete
        result.incompletePointer = currNode;
      }
    }

    addDataType(typeSpecifierDataType);

    if (isFunctionParam && result.dataType.type === "array") {
      // function parameters that are arrays are implictly converted into pointers to the underlying array element type
      result.dataType = {
        type: "pointer",
        pointeeType: result.dataType.elementDataType,
      };
    }

    return result;
  }

  /**
   * Creates intiializer list from string literal.
   * @param chars array of characters in the string, already in numeric form
   */
  function generateInitializerListFromStringLiteral(chars) {
    return generateNode("InitializerList", {
      values: chars.map((char) => ({
        type: "InitializerSingle",
        value: {
          type: "IntegerConstant",
          value: BigInt(char),
          suffix: null,
        },
      })),
    });
  }

  /**
   * Removes all the identifiers and tags(structs/enums) that were introduced to the symboltable inside parameter declarations of a function.
   */
  function removeFunctionParamIdentifiersAndTags(
    tagDefinitions,
    enumDeclarations,
    parameterNames
  ) {
    // remove all struct/enum tags
    const removedTags = new Set();
    for (const tagDefinition of tagDefinitions) {
      if (removedTags.has(tagDefinition.name)) {
        error(`redefinition of '${tagDefinition.tagSymbolEntry.type} ${tagDefinition.name}'`);
      }
      removedTags.add(tagDefinition.name);
      removeTagSymbolEntry(tagDefinition.name);
    }

    const removedIdentifiers = new Set();
    // remove all enumerator identifiers defined in params
    for (const enumDeclaration of enumDeclarations) {
      enumDeclaration.enumerators.forEach((e) => {
        if (removedIdentifiers.has(e.name)) {
          error(`'${e.name}' redeclared as different kind of symbol`)
        }
        removedIdentifiers.add(e.name);
        removeIdentifierSymbolEntry(e.name);
      });
    }
    

    // remove all parameter identifiers, no need check for redefintion as it was done in unpackParameters() already
    for (const paramName of parameterNames) {
      if (paramName !== null) {
        removeIdentifierSymbolEntry(paramName);
      }
    }
  }

  /**
   * Processes declarations.
   * Returns the declarations, as well as the dataType objects that are pointers to incomplete types
   * @returns { type: "Declaration", declarations: Declaration[], incompletePointers: PointerDataType[], tagDefinitions: { name: string, symbolEntry: { type: "struct" | "enum", dataType: DataType } }[], identifierDefinitions: { name: string, symbolEntry: { type: "type" | "variable", dataType: DataType } }[] }
   * identifierDefinitions is { name: string, symbolEntry: SymbolEntry } that represents each declared identifier
   * tagDefinitions is { name: string, symbolEntry: SymbolEntry } that represents each declared tag
   */
  function processDeclaration(declarationSpecifiers, declarators) {
    const declarations = [];
    const identifierDefinitions = [];
    const {
      enumDeclarations,
      tagDefinitions,
      hasTypeDefSpecifier,
      incompletePointers: incompletePointersFromSpecifiers,
      noType
    } = unpackDeclarationSpecifiers(declarationSpecifiers, true);

    if (noType) {
      error("at least 1 type specifier required in declaration specifiers of declaration");
    }

    const incompletePointers = incompletePointersFromSpecifiers ?? [];
    // add all enum fields as enum declarations to the array of all declarations
    if (typeof enumDeclarations !== "undefined") {
      enumDeclarations.forEach((enumDeclaration) => {
        declarations.push(enumDeclaration);
        // enumerator identifiers were already added to the symboltable, just track their identifier definitions
        for (const enumerator of enumDeclaration.enumerators) {
          identifierDefinitions.push({
            name: enumerator.name,
            symbolEntry: getIdentifierSymbolEntry(enumerator.name),
          });
        }
      });
    }
    declarators.forEach((declarator) => {
      const { declaration, incompletePointer } = evaluateDeclarator(
        declarationSpecifiers,
        declarator
      );
      // actually a typedef declaration
      if (hasTypeDefSpecifier) {
        if (declaration.initializer) {
          error("typedef is initialized");
        }
        identifierDefinitions.push(
          addIdentifierToSymbolTable(declaration.name, {
            type: "type",
            dataType: declaration.dataType,
          })
        );
      } else {
        identifierDefinitions.push(
          addIdentifierToSymbolTable(declaration.name, {
            type: "variable",
            dataType: declaration.dataType,
          })
        );
        declarations.push(declaration);
        // remove all tags and identifiers that were introduced in the parameters if this were a function declaration
        if (declarator.functionDefinitionInfo) {
          removeFunctionParamIdentifiersAndTags(
            declarator.functionDefinitionInfo.tagDefinitions,
            declarator.functionDefinitionInfo.enumDeclarations,
            declarator.functionDefinitionInfo.parameterNames
          );
          // delete this functionDefinition field from declarator - it is not needed
          delete declarator.functionDefinitionInfo;
        }
      }

      if (incompletePointer) {
        incompletePointers.push(incompletePointer);
      }
    });

    return generateNode("Declaration", {
      declarations,
      incompletePointers,
      identifierDefinitions,
      tagDefinitions,
    });
  }

  // similar to processDeclarations, with added enumeratorDeclaration as a result field (no longer incorporated into declarations)
  function processStructDeclaration(declarationSpecifiers, declarators) {
    const declarations = [];
    const incompletePointers = [];
    const {
      enumDeclarations,
      tagDefinitions,
      storageClass,
      hasTypeDefSpecifier,
    } = unpackDeclarationSpecifiers(declarationSpecifiers, true);
    if (storageClass || hasTypeDefSpecifier) {
      error("Struct field cannot have storage class specifier");
    }

    declarators.forEach((declarator) => {
      const { declaration, incompletePointer } = evaluateDeclarator(
        declarationSpecifiers,
        declarator
      );
      declarations.push(declaration);
      if (incompletePointer) {
        incompletePointers.push(incompletePointer);
      }
    });

    return { declarations, incompletePointers, enumDeclarations, tagDefinitions };
  }

  // evaluates the return of init_declarator or declarator with the given array of declaration specifiers, to return a declaration
  // return type: { declaration: Declaration, incompletePointer?: PointerDataType }
  function evaluateDeclarator(declarationSpecifiers, declarator) {
    const { dataType: typeSpecifierDataType, storageClass } =
      unpackDeclarationSpecifiers(declarationSpecifiers);
    const { name, dataType, incompletePointer, functionDefinitionInfo } =
      convertDeclaratorIntoDataTypeAndSymbolName(
        declarator,
        typeSpecifierDataType
      );

    const declarationNode = generateNode("Declaration", {
      name: name,
      storageClass: storageClass ?? "auto", // storage class is auto by default
      dataType: dataType,
      initializer: declarator.initializer, // may be undefined
    });
    if (declarationNode.dataType.type === "array") {
      if (typeof declarationNode.initializer !== "undefined") {
        if (declarationNode.initializer.type !== "InitializerList") {
          if (declarationNode.initializer.value.type === "StringLiteral") {
            declarationNode.initializer =
              generateInitializerListFromStringLiteral(
                declarationNode.initializer.value.chars
              );
          } else {
            error("Invalid initializer for array");
          }
        }
        // Array size deduction based on initializer list size
        if (typeof declarationNode.dataType.numElements === "undefined") {
          declarationNode.dataType.numElements = generateNode("IntegerConstant", {
            value: BigInt(declarationNode.initializer.values.length),
          });
        }
      } else if (typeof declarationNode.dataType.numElements === "undefined") {
        // no intializer provided, if numElements not defined, then it is set to 1 - TODO: provide warning to user
        declarationNode.dataType.numElements = generateNode("IntegerConstant", {
          value: 1n,
        });
      }
    }

    return {
      declaration: declarationNode,
      incompletePointer,
      functionDefinitionInfo,
    };
  }

  // Process function parameter.
  // @returns { type: "ParameterDeclaration", name: string | null, dataType: DataType, enumDeclarations, tagDefinitions, incompletePointers }
  function processParameterDeclaration(declarationSpecifiers, declarator) {
    const {
      dataType: typeSpecifierDataType,
      enumDeclarations,
      tagDefinitions,
      incompletePointers,
      storageClass,
      hasTypeDefSpecifier,
      noType
    } = unpackDeclarationSpecifiers(declarationSpecifiers, true);

    if (noType) {
      error("at least 1 type specifier required in declaration specifiers of declaration");
    }

    if (storageClass || hasTypeDefSpecifier) {
      error(`Cannot specify storage class for function parameter`);
    }
    if (declarator === null) {
      // abstractDeclarator was null
      return generateNode("ParameterDeclaration", {
        name: null,
        dataType: typeSpecifierDataType,
        enumDeclarations,
        tagDefinitions,
        incompletePointers,
      });
    }
    const { name, dataType, incompletePointer } =
      convertDeclaratorIntoDataTypeAndSymbolName(
        declarator,
        typeSpecifierDataType,
        true
      );

    if (incompletePointer) {
      incompletePointers.push(incompletePointer);
    }

    // add this parameter to symbol table
    addIdentifierToSymbolTable(name, {
      type: "variable",
      dataType: dataType,
    });

    if (enumDeclarations) {
      for (const enumDeclaration of enumDeclarations) {
        // add any declared enum variables
        enumDeclaration.enumerator.forEach((enumerator) => {
          addIdentifierToSymbolTable(enumerator.name, {
            type: "variable",
            dataType: createPrimaryDataType("signed int"),
          });
        });
      }
    }

    return generateNode("ParameterDeclaration", {
      name,
      dataType,
      enumDeclarations,
      tagDefinitions,
      incompletePointers,
    });
  }

  /**
   * Used to generate the DataType for type_name rule.
   * Functionally very similar to convertParameterDeclarationToDataTypeAndSymbolName.
   */
  function generateDataTypeFromSpecifierAndAbstractDeclarators(
    declarationSpecifiers,
    declarator
  ) {
    const { dataType: typeSpecifierDataType } = unpackDeclarationSpecifiers(
      declarationSpecifiers
    );
    if (declarator === null) {
      // abstractDeclarator was null
      return typeSpecifierDataType;
    }
    return convertDeclaratorIntoDataTypeAndSymbolName(
      declarator,
      typeSpecifierDataType
    ).dataType;
  }

  // extracts out all the datatype, names, enumDeclarations, tagDefinitions and incompletePointers from a set of parameterDeclarations
  function unpackParameters(parameterDeclarations) {
    const dataTypes = [];
    const names = [];
    const enumDeclarations = [];
    const tagDefinitions = [];
    const incompletePointers = [];
    const setOfIdentifiers = new Set();
    const setOfTags = new Set(); 
    parameterDeclarations.forEach((paramDeclaration) => {
      if (paramDeclaration.name !== null && setOfIdentifiers.has(paramDeclaration.name)) {
        error(`redefinition of parameter '${paramDeclaration.name}'`)
      }
      dataTypes.push(paramDeclaration.dataType);
      names.push(paramDeclaration.name);
      setOfIdentifiers.add(paramDeclaration.name);
      if (paramDeclaration.enumDeclarations) {
        enumDeclarations.forEach(enumDeclaration => {
          enumDeclaration.enumerators.forEach(enumerator => {
            if (setOfIdentifiers.has(enumerator.name)) {
              error(`'${enumerator.name}' redeclared as different kind of symbol`) 
            }
            setOfIdentifiers.add(enumerator.name);
          });
        });
        enumDeclarations.push(...paramDeclaration.enumDeclarations);
      }
      if (paramDeclaration.tagDefinitions) {
        tagDefinitions.forEach(tagDefinition => {
          if (setOfTags.has(tagDefinition.name)) {
            error(`redefinition of '${tagDefinition.tagSymbolEntry.type} ${tagDefinition.name}'`);
          } 
        });
        tagDefinitions.push(...paramDeclaration.tagDefinitions);
      }
      if (paramDeclaration.incompletePointers) {
        incompletePointers.push(...paramDeclaration.incompletePointers);
      }
    });

    return {
      names,
      dataTypes,
      enumDeclarations,
      tagDefinitions,
      incompletePointers,
    };
  }

  function generateFunctionDefinitionNode(
    declarationSpecifiers,
    declarator,
    body
  ) {
    const { declaration, functionDefinitionInfo } = evaluateDeclarator(
      declarationSpecifiers,
      declarator
    );
    const dataType = declaration.dataType;
    const name = declaration.name;
    if (!functionDefinitionInfo || dataType.type !== "function") {
      error("compound statement can only follow a function declarator");
    }

    addIdentifierToSymbolTable(declaration.name, {type: "variable", dataType});  

    const incompletePointers = body.incompletePointers;
    delete body.incompletePointers;

    // remove all tagDefinitions and identifiers declared in params from symboltable
    removeFunctionParamIdentifiersAndTags(
      functionDefinitionInfo.tagDefinitions,
      functionDefinitionInfo.enumDeclarations,
      functionDefinitionInfo.parameterNames
    );

    return generateNode("FunctionDefinition", {
      type: "FunctionDefinition",
      name: name,
      dataType: dataType,
      body,
      parameterNames: functionDefinitionInfo.parameterNames,
      incompletePointers
    });
  }

  /**
   * Used to create a ForLoop node whose clause is a declaration.
   */
  function createDeclarationForLoopNode(declaration, condition, update, body) {
    const { declarations, incompletePointers, identifierDefinitions, tagDefinitions } = declaration;
    // tagDefinitions not allowed in for loop
    if (tagDefinitions) {
      for (const tagDefinition of tagDefinitions) {
        error(`'${tagDefinition.tagSymbolEntry.type} ${tagDefinition.name}' declared in 'for' loop initialization`)
      }
    }
    // no need to handle incmplete pointers since there is no possibility of declaring them in a tag 

    // checks on declarations
    for (const declaration of declarations) {
      if (declaration.type === "EnumDeclaration") {
        // enum declarations not allowed in for loop clause
        for (const enumerator of declaration.enumerators) {
          error(`Declaration of non-variable '${enumerator.name}' in for loop initial declaration`);
        }
      } else if (declaration.storageClass !== "auto" && declaration.storageClass !== "register") { // as per standard, for loop variable can only be "auto" or "register" 
        error(`Declaration of ${declaration.storageClass} variable '${declaration.name}' in for loop initial declaration`);
      }
    }

    // remove all identifiers that were declared in for loop clause
    const removedIdentifiers = new Set();
    for (const identifierDefinition of identifierDefinitions) {
      if (identifierDefinition.name !== null) {
        if (removedIdentifiers.has(identifierDefinition.name)) {
          error(`redeclaration of variable ${identifierDefinition.name}`)
        }
        removedIdentifiers.add(identifierDefinition.name);
        removeIdentifierSymbolEntry(identifierDefinition.name);
      }
    }

    return generateNode("ForLoop", { clause: { type: "Declaration", value: declarations }, condition, update, body });
  }

  function addIncludedModuleDefinitions(includedModuleName) {
    addIncludedModuleFunctionDefinitions(includedModuleName);
    addIncludedModuleStructDefinitions(includedModuleName); 
  }
  
  function addIncludedModuleFunctionDefinitions(includedModuleName) {
   if (!(includedModuleName in thisParser.moduleRepository.modules)) {
      // included module is not found
      error(`Included module "${includedModuleName}" does not exist`);
    }

    // add all the defined structs in the module
    Object.entries(thisParser.moduleRepository.modules[includedModuleName].moduleFunctions).forEach(([name, fnDataType]) => {
      addIdentifierToSymbolTable(name, {type: "variable", dataType: fnDataType});
    }) 
  }

  function addIncludedModuleStructDefinitions(includedModuleName) {
    if (!(includedModuleName in thisParser.moduleRepository.modules)) {
      // included module is not found
      error(`Included module "${includedModuleName}" does not exist`);
    }

    // add all the defined structs in the module
    thisParser.moduleRepository.modules[includedModuleName].moduleDeclaredStructs.forEach(s => {
      addTagToSymbolTable(s.tag, {type: "struct", dataType: s});
    })
  }

  function createSizeOfDataTypeExpression(dataType) {
    if (dataType.type === "incomplete") {
      error("invalid application of 'sizeof' to incomplete type");
    }
    return generateNode("SizeOfExpression", { subtype: "dataType", dataType });
  }

}
// ======== Beginning of Grammar rules =========

program = includedModules:include|1.., _| _ rootNode:translation_unit _? { rootNode.includedModules = includedModules; return { compilationErrors, warnings, rootNode };}
        / rootNode:translation_unit _? { rootNode.includedModules = []; return { compilationErrors, warnings, rootNode };}

// this is the token separator. It is to be placed between every token of the ruleset as per the generated whitespace delimited tokens of the preprocesser. 
// it is optional, as certain rulesets containing optional lists like |.., ","| may not be present, so the separator needs to be optional to not fail parsing rules containing these empty lists.
// Otherwise, the optional setting does not affect anything, as it is guaranteed by the preprocesser that all tokens are delimited by whitespaces
_ "token separator"
  = " "

// a translation unit represents a complete c program
// should return an array of Statements or Functions
translation_unit 
  = items:(function_definition / declaration)|.., _| { return createRootNode(items); }
   
function_definition
	= declarationSpecifier:declaration_specifier _ declarator:declarator _ body:compound_statement { return generateFunctionDefinitionNode([declarationSpecifier], declarator, body); } 
  / declarationSpecifiers:declaration_specifiers _ declarator:declarator _ body:compound_statement { return generateFunctionDefinitionNode(declarationSpecifiers, declarator, body); }


// ======= Statements ==========

statement
  = iteration_statement
  / compound_statement 
  / jump_statement
  / expression_statement
  / selection_statement

// ======== Compound Statement =========

compound_statement "block"
	= "{" _ statements:block_item_list _ "}" { return createBlockNode(statements); }
  / "{" _ "}" { return createBlockNode([]); }
    
block_item_list
  = items:block_item|1.., _|

block_item
  = statement
  / declaration

// ========= Jump Statement ==========

jump_statement
  = "return" expr:(_ @expression)? _ ";" { return generateNode("ReturnStatement", { value: expr === null ? undefined : expr } ); }
  / "break" _ ";" { return generateNode("BreakStatement"); }
  / "continue" _ ";" { return generateNode("ContinueStatement"); }


// ========= Expression Statement =========

expression_statement
  = @(@expression _)? ";" // the optional specifier allows us to match empty specifiers

// ========== Iteration Statement ============

iteration_statement
  = "do" _ body:statement _ "while" _ "(" _ condition:expression _ ")" _ ";" { return generateNode("DoWhileLoop", { condition, body }); } // dowhile loops need to end with a ';'
  / "while" _ "(" _ condition:expression _ ")" _ body:statement { return generateNode("WhileLoop", { condition, body }); }
  / "for" _ "(" _ clause:(@expression _)? ";" _ condition:(@expression _)? ";" _ update:(@expression _)? ")" _ body:statement { return generateNode("ForLoop", { clause: clause === null ? null : { type: "Expression", value: clause }, condition, update, body }); }
  / "for" _ "(" _ clause:declaration _ condition:(@expression _)? ";" _ update:(@expression _)? ")" _ body:statement { return createDeclarationForLoopNode(clause, condition, update, body);  }

// ========== Selection Statement ===========

selection_statement
  = "if" _ "(" _ condition:expression _ ")" _ ifStatement:statement _ "else" _ elseStatement:statement { return generateNode("SelectionStatement", { condition, ifStatement, elseStatement }); } 
  / "if" _ "(" _ condition:expression _ ")" _ ifStatement:statement { return generateNode( "SelectionStatement", { condition, ifStatement }); }
  / "switch" _ "(" _ targetExpression:expression _ ")" _ "{" _ cases:switch_statement_case|1.., _| defaultStatements:(_ @switch_default_case)? _ "}"  { return createSwitchStatementNode(targetExpression, cases, defaultStatements ?? []); }
  / "switch" _ "(" _ targetExpression:expression _ ")" _ "{" _ defaultStatements:switch_default_case _ "}"  { return createSwitchStatementNode(targetExpression, [], defaultStatements); }
  / "switch" _ "(" _ targetExpression:expression _ ")" _ "{" _ "}" { return createSwitchStatementNode(targetExpression, [], []); } // functionally useless except for potentially side effect expression
  / "switch" _ "(" _ targetExpression:expression _ ")" _  statement { warn("Statement will never be executed"); return createSwitchStatementNode(targetExpression, [], []); } // useless switch statement (accpeted during parsing but functonally useless, except for potential side effets in expression)

switch_default_case
  = "default" _ ":" _ @block_item_list
  / "default" _ ":" { return []; }

switch_statement_case
  = "case" _ conditionMatch:constant_expression _ ":" _ statements:block_item_list { return generateNode("SwitchStatementCase", { conditionMatch, statements }); }
  / "case" _ conditionMatch:constant_expression _ ":" { return generateNode("SwitchStatementCase", { conditionMatch, statements: [] }); }

// ======== Declarations ========

// declaration returns an array of declaration nodes
declaration
  = declarationSpecifier:declaration_specifier _ initDeclarators:init_declarator_list _ ";" { return processDeclaration([declarationSpecifier], initDeclarators); }
  / declarationSpecifiers:declaration_specifier|2, _| _ initDeclarators:init_declarator_list _ ";" { return processDeclaration(declarationSpecifiers, initDeclarators); } // this rules must be first, as preferentially should try to match an declarator if possible (to deal with typedef ambiguity)
  / declarationSpecifiers:declaration_specifiers _ initDeclarators:init_declarator_list _ ";" { return processDeclaration(declarationSpecifiers, initDeclarators); }
  / declarationSpecifiers:declaration_specifiers _ ";" { return processDeclarationWithoutDeclarator(declarationSpecifiers); } // this rule supports anonymous structs and enums

declaration_specifiers
  = declaration_specifier|1.., _|

declaration_specifier
  = type_qualifier
  / storage_class_specifier
  / specifier:type_specifier { return generateNode("TypeSpecifier", { specifier } ); }
  / typedef_specifier

type_qualifier
  = "const" { return generateNode("TypeQualifier", { qualifier: "const"}); }

storage_class_specifier
  = specifier:("auto" / "static") { return generateNode("StorageClassSpecifier", { specifier }); }

typedef_specifier
  = "typedef" { return { type: "TypeDefSpecifier" }; }

type_specifier 
  = specifier:primary_data_type_specifier { return generateNode("PrimaryTypeSpecifier", { specifier }); }
  / specifier:struct_specifier { return generateNode("StructTypeSpecifier", { specifier }); } 
  / specifier:primary_data_type_length_specifier { return generateNode("PrimaryDataTypeLengthSpecifier", { specifier }); }
  / specifier:integer_sign_type_specifier { return generateNode("IntegerSignSpecifier", { specifier }); }
  / "void" { return generateNode("VoidTypeSpecifier"); }
  / specifier:enum_specifier { return generateNode("EnumTypeSpecifier", { specifier }); }
  / typeName:typedef_name { return generateNode("UserNamedTypeSpecifier", { typeName }); }

primary_data_type_specifier
  = "char" / "int" / "float" / "double"

primary_data_type_length_specifier
  = "long"
  / "short"

integer_sign_type_specifier
  = "signed"
  / "unsigned"

typedef_name
  = name:identifier &{ return isIdentifierAType(name); } { return name; }

init_declarator_list 
  = init_declarator|1.., _ "," _|

init_declarator
  = declarator:declarator _ "=" _ initializer:initializer  { return { ...declarator, initializer  }; } // this rule must come first as per PEG parsing behaviour
  / declarator:declarator

declarator 
  = pointers:pointer _ directDeclarator:direct_declarator { return createPointerDeclaratorNode(pointers, directDeclarator); }
  / directDeclarator:direct_declarator { return directDeclarator; }

pointer 
  = pointer_with_qualifier|1.., _|

pointer_with_qualifier
  = "*" qualifier:(_ @type_qualifier|1.., _|)? { return { type: "pointer", isConst: qualifier !== null}; } // since only have const as our single type qualifier this rule is fine

initializer
  = list_initializer
  / value:assignment_expression  { return createInitializerSingle(value); }

list_initializer
  = "{" _ list:(@initializer|.., _ "," _ | _)? ( "," _ )? "}" { return createInitializerList(list); } // list initializer can end with extra comma

direct_declarator 
  = directDeclarator:direct_declarator_helper _ declaratorSuffixes:( function_declarator_suffix / array_declarator_suffix )|1.., _| { return evaluateDeclaratorSuffixes(directDeclarator, declaratorSuffixes); } 
  / directDeclarator:direct_declarator_helper { return evaluateDeclaratorSuffixes(directDeclarator, []); }  

direct_declarator_helper // helper rule to remove left recursion in direct_declarator. Works fine as you cannot have a function returning a function in C.
  = symbolName:identifier { return { type: "SymbolDeclarator", symbolName }; }
  / "(" _ @declarator _ ")" 

// This rule, along with array_declarator_suffix, are helper rules to avoid left recursion, to use Peggy.js || expressions instead
function_declarator_suffix
  = "(" _ parameters:parameter_list _ ")" { return createFunctionDeclarator(parameters); }
  / "(" _ ")" { return createFunctionDeclarator(); } 

array_declarator_suffix
  = "[" _ numElements:(@assignment_expression _)? "]" { return { type: "ArrayDeclarator", numElements: numElements !== null ? numElements : undefined }; }

// ========= Struct related rules =========

struct_specifier
  = "struct" _ tag:(@identifier _)? "{" _ fieldDeclarations:struct_declaration_list _ "}" { return generateNode(tag === null ? "AnonymousStruct" : "NamedStructDefinition", createStructSpecifier(fieldDeclarations, tag)); }
  / "struct" _ tag:(@identifier _)? "{" _ "}" { return generateNode(tag === null ? "AnonymousStruct" : "NamedStructDefinition", createEmptyStructSpecifier(tag)); } 
  / "struct" _ tag:identifier { return generateNode("NamedStructReference", { tag } ); } // this struct is defined elsewhere

struct_declaration_list 
  = declarations:struct_declaration|1.., _| { return unpackStructDeclarations(declarations); } ; // unpack declarations

struct_declaration 
  = specifier:specifier_qualifier_list_item _ declarators:struct_declarator_list _ ";" { return processStructDeclaration([specifier], declarators); }
  / specifiers:specifier_qualifier_list _ declarators:struct_declarator_list _ ";" { return processStructDeclaration(specifiers, declarators); }

specifier_qualifier_list 
  = specifier_qualifier_list_item|1.., _| 

specifier_qualifier_list_item
  = specifier:type_specifier { return { type: "TypeSpecifier", specifier }; }
  / type_qualifier

struct_declarator_list
  = struct_declarator|1.., _ "," _|

struct_declarator
  = declarator 

enum_specifier
  = "enum" _ tag:identifier _ "{" _  enumerators:enumerator_list _ ("," _ )? "}" { return generateNode("NamedDefinedEnum", { tag, enumerators } ); }
  / "enum" _ "{" _  enumerators:enumerator_list _ ("," _ )? "}" { return generateNode("AnonymousEnum", { enumerators }); }
  / "enum" _ tag:identifier { return generateNode("NamedEnumReference", { tag }); } 

enumerator_list
  = enumerator|1.., _ "," _|

enumerator 
  = name:enumeration_constant _ "=" _ value:constant_expression { return { name, value }; }
  / name:enumeration_constant { return { name }; }

// =======================================

// ============ Function parameter declarations ============

parameter_list
  = parameters:parameter_declaration|1.., _ "," _| { return unpackParameters(parameters); }

parameter_declaration
  = declarationSpecifier:declaration_specifier _ declarator:declarator { return processParameterDeclaration([declarationSpecifier], declarator); }
  / declarationSpecifiers:declaration_specifiers _ declarator:declarator { return processParameterDeclaration(declarationSpecifiers, declarator); }
  / declarationSpecifiers:declaration_specifiers _ abstractDeclarator:abstract_declarator { return processParameterDeclaration(declarationSpecifiers, abstractDeclarator); } 
  / declarationSpecifiers:declaration_specifiers { return processParameterDeclaration(declarationSpecifiers, null); }// to support function declarations without explicit function paramter names 

// an abstract declarator is specifically for function declaration parameters that do not have names given to them
abstract_declarator
  = pointers:pointer _ directAbstractDeclarator:direct_abstract_declarator { return createPointerDeclaratorNode(pointers, directAbstractDeclarator); }
  / pointers:pointer { return createPointerDeclaratorNode(pointers, { type: "AbstractDeclarator" }); }
  / directAbstractDeclarator:direct_abstract_declarator { return directAbstractDeclarator; }

direct_abstract_declarator
  = directAbstractDeclarator:direct_abstract_declarator_helper _ declaratorSuffixes:( function_declarator_suffix / array_declarator_suffix )|1.., _| { return evaluateDeclaratorSuffixes(directAbstractDeclarator, declaratorSuffixes); }  
  / declaratorSuffixes:( function_declarator_suffix / array_declarator_suffix )|1.., _| { return evaluateDeclaratorSuffixes({ type: "AbstractDeclarator" }, declaratorSuffixes); }  

direct_abstract_declarator_helper
  = "(" _ @abstract_declarator _ ")"

// ===========================================================



// ========== Expressions ========
constant_expression
  = conditional_expression 

expression
  = expressions:assignment_expression|2.., _ "," _| { return generateNode("CommaSeparatedExpressions", { expressions }); }
  / assignment_expression

assignment_expression
  = lvalue:unary_expression _ assignmentOperator:assignment_operator _ assignedExpression:assignment_expression { return createAssignmentNode(lvalue, assignedExpression, assignmentOperator); }
  / conditional_expression

assignment_operator
  = "+=" / "-=" / "*=" / "/=" / "%=" / "<<=" / ">>=" / "&=" / "^=" / "|=" / "="

conditional_expression
  = condition:logical_or_expression _ "?" _ trueExpression:expression _ ":" _ falseExpression:conditional_expression { return generateNode("ConditionalExpression", { condition, trueExpression, falseExpression }); }
  / logical_or_expression

// binary expressions are ordered by operator precedence (top is least precedence, bottom is highest precedence)
logical_or_expression
  = firstExpr:logical_and_expression tail:(_ @"||" _ @logical_and_expression)+ { return createLeftToRightBinaryExpressionTree(firstExpr, tail); }
  / logical_and_expression

logical_and_expression
  = firstExpr:bitwise_or_expression tail:(_ @"&&" _ @bitwise_or_expression)+ { return createLeftToRightBinaryExpressionTree(firstExpr, tail); }
  / bitwise_or_expression

bitwise_or_expression
  = firstExpr:bitwise_xor_expression tail:(_ @"|" _ @bitwise_xor_expression)+ { return createLeftToRightBinaryExpressionTree(firstExpr, tail); }
  / bitwise_xor_expression

bitwise_xor_expression 
  = firstExpr:bitwise_and_expression tail:(_ @"^" _ @bitwise_and_expression)+ { return createLeftToRightBinaryExpressionTree(firstExpr, tail); }
  / bitwise_and_expression

bitwise_and_expression 
  = firstExpr:equality_relational_expression tail:(_ @"&" _ @equality_relational_expression)+ { return createLeftToRightBinaryExpressionTree(firstExpr, tail); }
  / equality_relational_expression

equality_relational_expression
  = firstExpr:relative_relational_expression tail:(_ @("!="/"==") _ @relative_relational_expression)+ { return createLeftToRightBinaryExpressionTree(firstExpr, tail); }
  / relative_relational_expression

relative_relational_expression
  = firstExpr:bitwise_shift_expression tail:(_ @("<="/">="/"<"/">") _ @bitwise_shift_expression)+ { return createLeftToRightBinaryExpressionTree(firstExpr, tail); }
  / bitwise_shift_expression

bitwise_shift_expression
  = firstExpr:add_subtract_expression tail:(_ @("<<" / ">>") _ @add_subtract_expression)+ { return createLeftToRightBinaryExpressionTree(firstExpr, tail); } 
  / add_subtract_expression

add_subtract_expression
  = firstExpr:multiply_divide_expression tail:(_ @("+" / "-") _ @multiply_divide_expression)+ { return createLeftToRightBinaryExpressionTree(firstExpr, tail); }
  / multiply_divide_expression

multiply_divide_expression
  = firstExpr:unary_expression tail:(_ @("*" / "/" / "%") _ @unary_expression)+ { return createLeftToRightBinaryExpressionTree(firstExpr, tail); }
  / unary_expression // as the last binary expression (highest precedence), this rule is needed

unary_expression 
  = operations:(@prefix_operation _)+ firstExpr:postfix_expression { return createPrefixExpressionNode(firstExpr, operations); }
  / postfix_expression

prefix_operation
  = operator:("++" / "--") { return { type: "PrefixExpression", operator }; }
  / operator:("+" / "-" / "!" / "~") { return { type: "PrefixExpression", operator }; }
  / operator:("*") { return { type: "PointerDereference" }; }
  / "&" { return { type: "AddressOfExpression" }; }
  / "sizeof" { return { type: "SizeOfExpression", subtype: "expression" }; }

postfix_expression
  = firstExpr:primary_expression operations:(_ @postfix_operation)+ { return createPostfixExpressionNode(firstExpr, operations); }
  / primary_expression

// all the postfix operations
postfix_operation
  = operator:("++" / "--") { return generateNode("PostfixExpression", { operator }); }
  / "(" _ args:function_argument_list _ ")" { return generateNode("FunctionCall", { args }); }
  / "(" _ ")" { return generateNode("FunctionCall", { args: [] } ); }
  / "[" _ index:expression _ "]" { return generateNode("ArrayElementExpr", { index }); }
  / "." _ fieldTag:identifier { return generateNode("StructMemberAccess", { fieldTag }); }
  / "->" _ fieldTag:identifier { return generateNode("StructPointerMemberAccess", { fieldTag }); }

function_argument_list
  = assignment_expression|1.., _ "," _|

primary_expression
  = "sizeof" _ "(" _ dataType:type_name _ ")" { return createSizeOfDataTypeExpression(dataType); }
  / name:identifier !{ return isIdentifierAType(name); } { return generateNode("IdentifierExpression", { name }); } // for variables 
  / constant
  / string_literal
  / "(" _ @expression _ ")"

type_name
  = specifiers:specifier_qualifier_list declarator:(_ @abstract_declarator)? { return generateDataTypeFromSpecifierAndAbstractDeclarators(specifiers, declarator); } 

// ======================================================
// ================= LEXICAL GRAMMAR ====================
// ======================================================

source_character_set
  = $[a-z0-9!'"#%&()*+,-./: ;<=>?\[\]^_{|}~\t\v\f]i 
  / extended_source_character_set

// some additional characters to support
extended_source_character_set
  = "@"

token
  = include
  / keyword 
  / identifier
  / constant 
  / string_literal 
  / punctuator 

include  // custom keyword for specifying modules to import
  = "#include <" identifier:identifier ">" { addIncludedModuleDefinitions(identifier); return identifier; } // add all the functions and structs declared in the module into the namespace

keyword  // must be ordered in descending order of length, as longer keywords take precedence in matching
  = "_Static_assert"/"_Thread_local"/"_Imaginary"/"_Noreturn"/"continue"/"register"/"restrict"/"unsigned"/"volatile"/"_Alignas"/"_Alignof"/"_Complex"/"_Generic"/"default"/"typedef"/"_Atomic"/"extern"/"inline"/"double"/"return"/"signed"/"sizeof"/"static"/"struct"/"switch"/"break"/"float"/"const"/"short"/"union"/"while"/"_Bool"/"auto"/"case"/"char"/"goto"/"long"/"else"/"enum"/"void"/"for"/"int"/"if"/"do"

identifier
  = str:$([a-z_]i[a-z0-9_]i*)  &{ return isStringAKeyword(str) ? false : true; } { return str; } // predicate prevents matching a keyword as an identifier, which can be possible in complex rules

// ====================== Constants ======================
// =======================================================

constant
  = floating_constant // floating constant must come first as it is more specific (longer match takes precedence, and start of float_constant can be an integer_constant.
  / integer_constant
  / enumeration_constant 
  / character_constant 

// ====================== Integer Constants ======================

integer_constant
  = value:( $decimal_constant / octal_constant / $hexadecimal_constant / "0" ) suffix:$integer_suffix? { return generateIntegerConstant(value, suffix); }

decimal_constant 
  = nonzero_digit digit*

nonzero_digit
  = $[1-9]

digit 
  = $[0-9]

octal_constant
  = "0" value:$octal_digit+ { return "0o" + value; } // add the '0o' before value for JS to treat the string as octal

octal_digit
  = $[0-7]

hexadecimal_constant 
  = hexadecimal_prefix hexadecimal_digit+

hexadecimal_prefix 
  = "0x" / "0X"

hexadecimal_digit 
  = $[0-9A-F]i

integer_suffix
  = unsigned_suffix long_long_suffix // must come first to be as long_long_suffix is more specific than long_suffix
  / unsigned_suffix long_suffix?
  / long_long_suffix unsigned_suffix?
  / long_suffix unsigned_suffix?

unsigned_suffix
  = "u" / "U"

long_suffix 
  = "l" / "L"

long_long_suffix 
  = "ll" / "LL"

// =======================================================

// ================== Floating Constants =================

floating_constant 
  = decimal_floating_constant

decimal_floating_constant
  = value:$(fractional_constant exponent_part?) suffix:$floating_suffix? { return generateFloatConstant(value, suffix); }
  / value:$(digit+ exponent_part) suffix:floating_suffix? { return generateFloatConstant(value, suffix); }

fractional_constant
  = digit* "." digit+ 
  / digit+ "."

exponent_part
  = ("e" / "E") ("+" / "-")? digit+

floating_suffix 
  = [fl]i

// =======================================================

enumeration_constant
  = name:identifier !{ return isIdentifierAType(name); } { return name; }

// ================== Character Constants =================

character_constant
  = "'" value:c_char "'" { return generateNode("IntegerConstant", { value: BigInt(value) }); }

c_char 
  = char:[a-z0-9!"#%&()*+,-./: ;<=>?\[\]^_{|}~\t\v\f]i { return char.charCodeAt(0); } // any member of source character set except ', \ and newline
  / char:extended_source_character_set { return char.charCodeAt(0); }
  / escape_sequence

escape_sequence
  = simple_escape_sequence
  / octal_escape_sequence
  / hexadecimal_escape_sequence

simple_escape_sequence
  = "\\\'"  { return 39; } 
  / "\\\""  { return 34; }
  / "\\?"   { return 63; }
  / "\\\\"  { return 92; }
  / "\\a"   { return 7; }
  / "\\b"   { return 8; }
  / "\\f"   { return 12; }
  / "\\r"   { return 13; }
  / "\\n"   { return 10; }
  / "\\t"   { return 9; }
  / "\\v"   { return 11; }

octal_escape_sequence
  = "\\" value:$octal_digit|1..3| { return parseInt(value, 8); }

hexadecimal_escape_sequence
  = "\\x" value:$hexadecimal_digit|1..2| { return parseInt(value, 16); }

// ======================================================
  
// ================== String Literals ===================

string_literal
  = '"' chars:s_char* '"' { chars.push(0); return generateNode("StringLiteral", { chars }); };

s_char
  = char:[a-z0-9!'#%&()*+,-./: ;<=>?\[\]^_{|}~\t\v\f]i { return char.charCodeAt(0); } // any member of source character set except ", \ and newline 
  / escape_sequence

// ======================================================

punctuator // ordered by number of chars in the punctuator, as longer punctuators must take precedence in matching
  = "%:%:"
  / "..." / "<<=" / ">>=" 
  / "++" / "--" / "+=" / "-=" / "*=" / "/=" / "%="  / "&=" / "^=" 
  / "|=" / "==" / "!=" / "<=" / ">=" / ">>" / "<<" / "->" / "&&" / "||"
  / "##" / "%:" / "<:" / ":>" / "<%" / "%>"
  / "[" / "]" / "(" / ")" / "{" / "}" / "." / "&" / "*" / "+" / "-" / "~" 
  / "!" / "/" / "%" / "<" / ">" / "^" / "|" / "?" / ":" / ";" / "=" / "," / "#"



