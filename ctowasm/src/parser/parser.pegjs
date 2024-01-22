{
  /**
   * Helper function to create and return a Node with position and type information
   */
  function generateNode(type, data) {
    const loc = location();
    return {
      type: type,
      position: {
        start: loc.start,
        end: loc.end,
        offset: loc.offset
      },
      ...data
    };
  }

  const C_Keywords = new Set([
    "auto","extern","break","float","case","for","char","goto","const","if","continue","inline","default","int","do","long","double","register","else","restrict","enum","return","short","signed","sizeof","static","struct","switch","typedef","union","unsigned","void","volatile","while","_Alignas","_Alignof","_Atomic","_Bool","_Complex","_Generic","_Imaginary","_Noreturn","_Static_assert","_Thread_local"
  ])

  /**
   * Needed to handle ambiguity between identifier and keyword.
   */
  function isStringAKeyword(str) {
    return C_Keywords.has(str);
  }

  const incompletePointers = [] // will hold an array of pointer DataType objects which point to complete types

  const userDefinedDataTypes = {} // Record<string, DataType> object to hold user defined types using typedef and struct

  function getUserDefinedDataType(typeName) {
    if (typeName in userDefinedDataTypes) {
      return userDefinedDataTypes[typeName];
    }
    return { type: "incomplete", typeName }; // typeName was not found. just return incomplete type for now.
  }

  function addUserDefinedDataType(typeName, dataType) {
    if (typeName in userDefinedDataTypes) {
      error(`Redefinition of '${typeName}'`);
    }
    userDefinedDataTypes[typeName] = dataType;
  }

  /**
   * Creates the Root node. Since Root node is created at the top of the parse tree, this function is run after the whole proram is parsed.
   * Thus any cleanup/extra logic that requires information which is only completely available after parsing can be done here.
   */
  function createRootNode(children) {
    // fill in all the incomplete pointer DataTypes
    for (const incompletePointer of incompletePointers) {
      // the typename of the incomplete pointer would have been saved in pointeetype
      const typeName = incompletePointer.pointeeType.typeName; 
      incompletePointer.pointeeType = getUserDefinedDataType(typeName);
      if (incompletePointer.pointeeType.type === "incomplete") {
        // if still incomplete, then the type was never defined
        error(`Unknown type name '${typeName}'`);
      }
    }

    return generateNode("Root", { children });
  }

  function processDeclarationWithoutDeclarator(declarationSpecifiers) {
    // TODO: add typedef specifier logic later
    const typeSpecifierDataType = getTypeSpecifierDataType(declarationSpecifiers);
    if (typeSpecifierDataType.type !== "struct") {
      warning("useless type name in empty declaration");
    }
    return null;
  }


  /**
   * Builds and returns a tree of binary operations which involves the 2 operaands (left and right expressions), and a operator
   * @param firstExpr first expression in the operation expression e.g. "2" in "2 + 3 + 4"
   * @param exprsWithOperatorArr an array of arrays of size 2 which contain an operator in first index and the expr in 2nd index. e.g: [["+", 3], ["+", 4]]
   */
  function createLeftToRightBinaryExpressionTree(firstExpr, exprsWithOperatorArr) {
    let currNode = firstExpr;
    for (const operation of exprsWithOperatorArr) {
      // create a new operation node
      currNode = generateNode("BinaryExpression", {
        leftExpr: currNode,
        rightExpr: operation[1],
        operator: operation[0]
      })
    }
    return currNode
  }

  function createUnaryExpressionNode(expr, operator) {
    // special handling for negated constants, just negate the value of constant
    if (operator === "-" && (expr.type === "IntegerConstant" || expr.type === "FloatConstant")) {
      return {
        ...expr,
        value: -expr.value
      }
    }

    return generateNode("UnaryExpression", {
      operator,
      expression: expr
    })
  }

  // Creates a PrimaryDataType object.
  function createPrimaryDataType(primaryDataType) {
    return {
      type: "primary",
      primaryDataType
    };
  } 

  function createArrayDataType(elementDataType, numElements) {
    return {
      type: "array",
      elementDataType: elementDataType,
      numElements
    }
  }

  function createInitializerList(values) {
    values = values ?? [];
    return generateNode("InitializerList", {
      values
    });
  }

  function createInitializerSingle(value) {
    return generateNode("InitializerSingle", {
      value
    });
  }

  // Evaluates the string of postfix expressions to generate a complete tree of unary expression nodes
  // Follows left to right associativity.
  // TODO: add struct & pointer operation handling
  function createPostfixExpressionNode(firstExpr, operations) {
    let currNode = firstExpr;
    for (const operation of operations) {
      if (operation.type === "ArrayElementExpr") {
        // array element expr are equivalent to pointer dereference expression A[B] => *(A + B)
        currNode = {
          type: "PointerDereference",
          expr: {
            type: "BinaryExpression",
            leftExpr: currNode,
            rightExpr: operation.index,
            operator: "+"
          }
        }
      } else if (operation.type === "StructPointerMemberAccess") {
        // similar to array element expr, a->x is equivalent to *a.x
        currNode = {
          type: "StructMemberAccess",
          expr: {
            type: "PointerDereference",
            expr: currNode
          },
          fieldTag: operation.fieldTag
        }
      } else {
        currNode = {
          ...operation,
          expr: currNode
        }
      }
    }
    return currNode;
  }

  // Evaluates the string of prefix expressions to generate a complete tree of unary expression nodes
  // Follows right to left associativity
  // TODO: add struct & pointer operation handling
  // @param firstExpr refers to the rightmost expression
  function createPrefixExpressionNode(firstExpr, operations) {
    let currNode = firstExpr;
    for (let i = operations.length - 1; i >= 0; --i) {
      currNode = {
        ...(operations[i]),
        expr: currNode
      }
    }
    return currNode;
  } 

  /**
   * Evaluates a string of assignment expressions from right to left.
   * The resultant node does not consists of "BinaryExpression" nodes, as they consist of unique nodes depending on the expression (unlike regular arithmetic binary expressions).
   * This is used for assignment and compound assignment expressions.
   * @param firstExpr refers to the rightmost expression
   */
  function createAssignmentTree(firstExpr, assignmentOperations) {
    let currNode = firstExpr;
    for (let i = assignmentOperations.length - 1; i >= 0; --i) {
      const operation = assignmentOperations[i]
      // check if operator is null
      if (operation[1].length > 1) {
        // compound assignment
        currNode = {
          type: "Assignment",
          lvalue: operation[0],
          expr: {
            type: "BinaryExpression",
            leftExpr: operation[0],
            rightExpr: currNode,
            operator: operation[1][0]
          }
        }
      } else {
        currNode = {
          type: "Assignment",
          lvalue: operation[0],
          expr: currNode
        }
      }
    }
    return currNode; 
  }

  /**
   * Given an array of pointers ("*"), create a tree of PointerDeclarators, ending in the directDeclarator.
   */
  function createPointerDeclaratorNode(pointers, directDeclarator) {
    let currNode = directDeclarator;
    for (const pointer of pointers) {
      currNode = {
        type: "PointerDeclarator",
        directDeclarator: currNode
      }
    }
    return currNode;
  }

  // evaluate the delclarator suffixes of direct_declarator
  // this is used to evaluate declarators which have [] or () suffixes which indicate
  // that they are array of function suffixs respectively
  function evaluateDeclaratorSuffixes(directDeclarator, declaratorSuffixes) {
    let currNode = directDeclarator;
    for (const suffix of declaratorSuffixes) {
      // some error checking
      if (suffix.type === "FunctionDeclarator") {
        // you can only have string of consecutive array declarators
        if (currNode.type === "FunctionDeclarator") {
          error("Cannot have a function returning a function", location());
        }
        // you cannot have an array of functions
        if (currNode.type === "ArrayDeclarator") {
          error("Cannot have an array of functions", location());
        }
      } else {
        // suffix is "ArrayDeclarator"
        if (currNode.type === "FunctionDeclarator") {
          // cannot have a function returning array
          error("Cannot have a function returning an array", location());
        }
      }

      currNode = { directDeclarator: currNode, ...suffix };
    }
    return currNode;
  }

  // Return the type specifier data type from a list of declarationspecifiers
  function getTypeSpecifierDataType(declarationSpecifiers) {
    let typeSpecifierDataType;
    let numberOfTypeSpecifiers = 0;
    declarationSpecifiers.forEach(specifier => {
      if (specifier.type === "TypeSpecifier") {
        typeSpecifierDataType = specifier.dataType;
        numberOfTypeSpecifiers++;
      }
    })

    if (numberOfTypeSpecifiers === 0) {
      error("Type specifier required in declaration specifiers", location());
    } else if (numberOfTypeSpecifiers > 1) {
      error(`${numberOfTypeSpecifiers} type specifiers present in declaration specifiers, should only have 1`, location());
    }

    return typeSpecifierDataType;
  }

  function generateStructDataType(fieldDeclarations, tag) {
    const structDataType = {
      type: "struct",
      tag,
      fields: []
    }

    // add the declarations of each field to the struct
    fieldDeclarations.forEach(declaration => {
      structDataType.fields.push({ tag: declaration.name, dataType: declaration.dataType });
    })

    if (tag !== null) {
      // if the tag of the struct was provided, it defines a new user defined type
      addUserDefinedDataType(`struct ${tag}`, structDataType);
    }
    return structDataType;
  }


  // Recursively traverses a tree of declarators to create a DataType object and extract the name of the symbol with this dataType,
  // returning the object with type: { name: string, dataType: DataType }
  // this function is able to evaluate declarators used in function declarations that do not have a symbol as well.
  // optionally takes a param @isFunctionParam that indicates that this declarator is used in a function parameter
  function convertDeclaratorIntoDataTypeAndSymbolName(declarator, typeSpecifierDataType, isFunctionParam) {
    const result = {};
    let currNode = result;
    // helper function to add datatype to currNode
    function addDataType(dataTypeToAdd) {
      // only pointers and functions can have null type specifier - void type
      if (dataTypeToAdd.type === "void") {
        if (typeof currNode.type === "undefined" || currNode.type === "primary") {
          error(`Variable or field declared as void`, location());
        } else if (currNode.type === "array") {
          error(`Declaration of array of voids`, location());
        } else if (currNode.type === "function") {
          currNode.returnType = null;
          return;
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
          type: "pointer"
        }
        addDataType(pointerType)
        currNode = pointerType;
      } else if (declarator.type === "FunctionDeclarator") {
        const functionType = {
          type: "function",
          parameters: declarator.parameters,
          parameterNames: declarator.parameterNames
        }
        // some error checks
        if (currNode.type === "FunctionDeclarator") {
          error("Cannot declare a function returning a function", location());
        } else if (currNode.type === "ArrayDeclarator") {
          error("Cannot declare an array of functions", location());
        }

        addDataType(functionType);
        currNode = functionType;
      } else if (declarator.type === "ArrayDeclarator") {
        const arrayType = {
          type: "array",
          numElements: declarator.numElements
        }
        
        if (currNode.type === "FunctionDeclarator") {
          error("Cannot declare a function returning an array", location());
        }

        addDataType(arrayType);
        currNode = arrayType;
      } else {
        error("Unknown declarator type", location());
      }
    }

    recursiveHelper(declarator);

    // Only pointers can point to incomplete types
    if (typeSpecifierDataType.type === "incomplete") {
      if (currNode.type !== "pointer") {
        error(`Unknown type name '${typeSpecifierDataType.typeName}'`);
      } else {
        // keep track that this pointer datatype as incomplete
        incompletePointers.push(currNode);
      }
    }

    addDataType(typeSpecifierDataType);
    
    if (isFunctionParam && result.dataType.type === "array") {
      // function parameters that are arrays are implictly converted into pointers to the underlying array element type
      result.dataType = {
        type: "pointer",
        pointeeType: result.dataType.elementDataType
      }
    }

    return result;
  }

  // evaluates the return of init_declarator or declarator with the given array of declaration specifiers, to return a declaration
  // TODO: edit this function when more specifiers are supported
  function evaluateDeclarator(declarationSpecifiers, declarator) {
    const typeSpecifierDataType = getTypeSpecifierDataType(declarationSpecifiers);
    const dataTypeAndSymbolName = convertDeclaratorIntoDataTypeAndSymbolName(declarator, typeSpecifierDataType);
    
    const declarationNode = {
      type: "Declaration",
      name: dataTypeAndSymbolName.name,
      dataType: dataTypeAndSymbolName.dataType,
      initializer: declarator.initializer // may be undefined
    };
    if (declarationNode.dataType.type === "array") {
      if (typeof declarationNode.initializer !== "undefined") {
        if (declarationNode.initializer.type !== "InitializerList") {
          error("Invalid initializer for array", location());
        }
        // Array size deduction based on initializer list size
        if (typeof declarationNode.dataType.numElements === "undefined") {
          declarationNode.dataType.numElements = generateNode("IntegerConstant", { value: BigInt(declarator.initializer.values.length) });
        }
      } else if (typeof declarationNode.dataType.numElements === "undefined") {
        // no intializer provided, if numElements not defined, then it is set to 1 - TODO: provide warning to user
        declarationNode.dataType.numElements = generateNode("IntegerConstant", { value: 1n } );
      }
    }    

    return declarationNode;
  }

  // Returns function parameter declaration as { name: string | null, dataType: DataType }
  // @param declarator can be an abstract declarator (no symbol name).
  function convertParameterDeclarationToDataTypeAndSymbolName(declarationSpecifiers, declarator) {
    const typeSpecifierDataType = getTypeSpecifierDataType(declarationSpecifiers);
    if (declarator === null) {
      // abstractDeclarator was null
      return { dataType: typeSpecifierDataType, name: null};
    }
    return convertDeclaratorIntoDataTypeAndSymbolName(declarator, typeSpecifierDataType, true);
  }

  /**
   * Used to generate the DataType for type_name rule.
   * Functionally very similar to convertParameterDeclarationToDataTypeAndSymbolName.
   */
  function generateDataTypeFromSpecifierAndAbstractDeclarators(declarationSpecifiers, declarator) {
    const typeSpecifierDataType = getTypeSpecifierDataType(declarationSpecifiers);
    if (declarator === null) {
      // abstractDeclarator was null
      return typeSpecifierDataType;
    }
    return convertDeclaratorIntoDataTypeAndSymbolName(declarator, typeSpecifierDataType).dataType;
  }

  // splits an array of parameter declartions which are objects: { dataType: DataType, name: string | null } into 2 separate arrays by field
  function splitParameterDataTypesAndNames(paramDataTypeAndNames) {
    const dataTypes = [];
    const names = [];

    paramDataTypeAndNames.forEach(paramDataTypeAndName => {
      dataTypes.push(paramDataTypeAndName.dataType);
      names.push(paramDataTypeAndName.name);
    });

    return { dataTypes, names };
  }

  function generateFunctionDefinitionNode(declarationSpecifiers, declarator, body) {
    const functionDeclaration = evaluateDeclarator(declarationSpecifiers, declarator); // evaluate the declarator section of function
    if (functionDeclaration.dataType.type !== "function") {
      error("Compound statement can only follow a function declarator", location()); //TODO: maybe give a bit better error message
    }
    return {
      type: "FunctionDefinition",
      name: functionDeclaration.name,
      dataType: functionDeclaration.dataType,
      body,
      parameterNames: functionDeclaration.dataType.parameterNames
    }
  }

  // Unpacks an array containing declarations which may consist of multiple declaratons and other nodes 
  // also removes nulls from teh array
  function unpack(blockItems) {
    const unpackedItems = [];
    blockItems.forEach(item => {
      if (item === null) {
        return;
      } else if (Array.isArray(item)) {
        unpackedItems.push(...item);
      } else {
        unpackedItems.push(item);
      }
    })
    return unpackedItems;
  }
}

// ======== Beginning of Grammar rules =========

program = children:translation_unit  { return createRootNode(children); }

// a translation unit represents a complete c program
// should return an array of Statements or Functions
translation_unit 
  = items:(function_definition / declaration)|.., _| { return unpack(items); } //TODO: come back here for ;
   
function_definition
	= declarationSpecifiers:declaration_specifiers _ declarator:declarator _ body:compound_statement { return generateFunctionDefinitionNode(declarationSpecifiers, declarator, body); }


// ======= Statements ==========

statement
  = iteration_statement
  / compound_statement 
  / jump_statement
  / expression_statement
  / selection_statement


// ======== Compound Statement =========

compound_statement "block"
	= "{" _ statements:block_item_list _ "}" { return generateNode("Block", { statements }); }
  / "{" _ "}" { return generateNode("Block", { statements: [] }); }
    
block_item_list
  = items:block_item|1.., _| { return unpack(items); } // unpack any arrays, as declarations can declare multiple symbols in one declarations which equates to multiple declaration nodes

block_item
  = declaration
  / statement

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
  / "for" _ "(" _ clause:declaration _ condition:(@expression _)? ";" _ update:(@expression _)? ")" _ body:statement { return generateNode("ForLoop", { clause: { type: "Declaration", value: clause }, condition, update, body }); }


// ========== Selection Statement ===========

selection_statement
  = "if" _ "(" _ condition:expression _ ")" _ ifStatement:statement _ "else" _ elseStatement:statement { return { type: "SelectionStatement", condition, ifStatement, elseStatement }; } 
  / "if" _ "(" _ condition:expression _ ")" _ ifStatement:statement { return { type: "SelectionStatement", condition, ifStatement }; }



// ======== Declarations ========

// declaration returns an array of declaration nodes
declaration
  = declarationSpecifiers:declaration_specifiers _ initDeclarators:init_declarator_list _ ";" { return initDeclarators.map(initDeclarator => evaluateDeclarator(declarationSpecifiers, initDeclarator) ); }
  / declarationSpecifiers:declaration_specifiers _ ";" { return processDeclarationWithoutDeclarator(declarationSpecifiers); } // TODO: this rule supports declarations of structs and typedef where nothing is being declared, merely a type

declaration_specifiers
  = declaration_specifier|1.., _|

// TODO: add more specifiers
declaration_specifier
  = dataType:type_specifier { return { type: "TypeSpecifier", dataType }; }

// type specifier should return a DataType
type_specifier
	=  primaryDataType:primary_type_specifier { return primaryDataType === "void" ? { type: "void" } : { type: "primary", primaryDataType }; }
  /  struct_specifier

primary_type_specifier
  = float_type // check for float type first, due to "long double" needing to be checked before "long" by itself
  / signed_integer
  / unsigned_integer
  / "void"

init_declarator_list 
  = init_declarator|1.., _ "," _|

init_declarator
  = declarator:declarator _ "=" _ initializer:initializer  { return { ...declarator, initializer  }; } // this rule must come first as per PEG parsing behaviour
  / declarator:declarator

declarator 
  = pointers:pointer _ directDeclarator:direct_declarator { return createPointerDeclaratorNode(pointers, directDeclarator); }
  / directDeclarator:direct_declarator { return directDeclarator; }

// TODO: add type qualifiers to pointer
pointer 
  = "*"|1.., _|

initializer
  = list_initializer
  / value:expression  { return createInitializerSingle(value); }

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
  = "(" _ parameterDataTypesAndNames:parameter_list _ ")" { return { type: "FunctionDeclarator", parameters: parameterDataTypesAndNames.dataTypes, parameterNames: parameterDataTypesAndNames.names }; }
  / "(" _ ")" { return { type: "FunctionDeclarator", parameters: [], parameterNames: [] }; } 

array_declarator_suffix
  = "[" _ numElements:(@expression _)? "]" { return { type: "ArrayDeclarator", numElements: numElements !== null ? numElements : undefined }; }

// ========= Struct related rules =========

struct_specifier
  = "struct" _ tag:(@identifier _)? "{" _ fieldDeclarations:struct_declaration_list _ "}" { return generateStructDataType(fieldDeclarations, tag); }
  / "struct" _ tag:(@identifier _)? "{" _ "}" { return generateStructDataType([], tag); } 
  / "struct" _ structName:identifier { return getUserDefinedDataType(`struct ${structName}`); } // this struct is defined elsewhere, just retrieve it

struct_declaration_list 
  = declarations:struct_declaration|1.., _| { return unpack(declarations); } ; // unpack declarations

struct_declaration 
  = specifiers:specifier_qualifier_list _ fieldDeclarators:struct_declarator_list _ ";" { return fieldDeclarators.map(declarator => evaluateDeclarator(specifiers, declarator)); }

specifier_qualifier_list 
  = specifier_qualifier_list_item|1.., _| // TODO: add type qualifiers in future 

specifier_qualifier_list_item
  = dataType:type_specifier { return { type: "TypeSpecifier", dataType }; }

struct_declarator_list
  = struct_declarator|1.., _ "," _|

struct_declarator
  = declarator 

// =======================================

// ============ Function parameter declarations ============

parameter_list
  = parameters:parameter_declaration|1.., _ "," _| { return splitParameterDataTypesAndNames(parameters); }

parameter_declaration
  = declarationSpecifiers:declaration_specifiers _ declarator:declarator { return convertParameterDeclarationToDataTypeAndSymbolName(declarationSpecifiers, declarator); }
  / declarationSpecifiers:declaration_specifiers _ abstractDeclarator:abstract_declarator { return convertParameterDeclarationToDataTypeAndSymbolName(declarationSpecifiers, abstractDeclarator); } 
  / declarationSpecifiers:declaration_specifiers { return convertParameterDeclarationToDataTypeAndSymbolName(declarationSpecifiers, null); }// to support function declarations without explicit function paramter names 

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

expression
  = assignment

assignment
  = assignmentOperations:(@logical_or_expression _ @("+=" / "-=" / "*=" / "/=" / "%=" / "<<=" / ">>=" / "&=" / "^=" / "|=" / "=") _ )+ firstExpr:logical_or_expression { return createAssignmentTree(firstExpr, assignmentOperations); }
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
  = firstExpr:prefix_expression tail:(_ @("*" / "/" / "%") _ @prefix_expression)+ { return createLeftToRightBinaryExpressionTree(firstExpr, tail); }
  / prefix_expression // as the last binary expression (highest precedence), this rule is needed

prefix_expression 
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
  = operator:("++" / "--") { return { type: "PostfixExpression", operator }; }
  / "(" _ args:function_argument_list _ ")" { return { type: "FunctionCall", args }; }
  / "(" _ ")" { return { type: "FunctionCall", args: [] }; }
  / "[" _ index:expression _ "]" { return { type: "ArrayElementExpr", index }; }
  / "." _ fieldTag:identifier { return { type: "StructMemberAccess", fieldTag }; }
  / "->" _ fieldTag:identifier { return { type: "StructPointerMemberAccess", fieldTag }; }

function_argument_list
  = expression|1.., _ "," _|

primary_expression
  = "sizeof" _ "(" _ dataType:type_name _ ")" { return generateNode("SizeOfExpression", { type: "SizeOfExpression", subtype: "dataType", dataType }); } // TODO: check this, since no postfix opreator can be applied to result of sizeof, putting it here should be fine
  / name:identifier { return generateNode("IdentifierExpression", { name }); } // for variables 
  / constant
  / "(" _ @expression _ ")"

type_name
  = specifiers:specifier_qualifier_list declarator:(_ @abstract_declarator)? { return generateDataTypeFromSpecifierAndAbstractDeclarators(specifiers, declarator); } 

//=========== Constants =============

constant
	= floating_constant // must come first as floating and integer constant both can start with digit, but float more specific
  / integer_constant
  / character_constant
    
floating_constant
  = value:decimal_floating_constant suffix:("f" / "F" / "l" / "L" / "") { return generateNode("FloatConstant", { value: Number(value), suffix: suffix === "f" || suffix === "F" ? "f" : undefined }); }

integer_constant
	= value:integer suffix:("ul" / "Ul" / "UL" / "uL" / "l" / "L" / "u" / "U" / "ll" / "LL" / "") { return generateNode("IntegerConstant", { value: BigInt(value), suffix: suffix.length > 0 ? (suffix.toLowerCase() === "ll" ? "l" : suffix.toLowerCase()) : undefined }); } 

character_constant
  = "'" value:c_char "'" {return generateNode("IntegerConstant", { value: BigInt(value) }); }




//=========== Characters ============

// All the possible C characters that can be in a source file
source_c_set
  = [a-z0-9!"#%&\'()*+,-./: ;<=>?\[\\\]^_{|}~ \n\t\v\f]i
  / extended_c_char_set
// 
c_char
  = char:[a-z0-9!"#%&()*+,-./: ;<=>?\[\]^_{|}~\t\v\f]i { return char.charCodeAt(0); }
  / extended_c_char_set
  / escape_sequence

// Characters not required to be in the basic character set, but should be supported.
extended_c_char_set
  = char:[@] { return char.charCodeAt(0); }
  
escape_sequence 
  = "\\\'"  { return 39; } 
  / "\\\""  { return 34; }
  / "\\?"   { return 63; }
  / "\\\\"  { return 92; }
  / "\\a"   { return 7; }
  / "\\b"   { return 8; }
  / "\\f"   { return 12; }
  / "\\n"   { return 10; }
  / "\\t"   { return 9; }
  / "\\v"   { return 11; }
  / "\\0"   { return 0; }




// =========== Types ================

signed_integer 
  = ("char" / "signed char") { return "signed char"; }
  / ("short" / "signed short") { return "signed short"; }
  / ("int" / "signed int") { return "signed int"; } 
  / (long_type / "signed " long_type) { return "signed long"; }

unsigned_integer
  = $"unsigned char"
  / $"unsigned short"
  / $"unsigned int"
  / $"unsigned long"

// long can be matched by multiple type keywords - all 8 bytes long in this compiler
long_type
  = "long long int"
  / "long long" 
  / "long int" 
  / "long"

float_type
  = "float"
  / ("double" / "long double") { return "double"; }
    



// =============== Floating constant related rules ===============

decimal_floating_constant
  = scientific_notation_floating_constant
  / fractional_constant

scientific_notation_floating_constant
  = $(fractional_constant ("E" / "e") ("+" / "-" / "") [0-9]+)
  / $([0-9]+ ("E" / "e") ("+" / "-" / "") [0-9]+)

fractional_constant
  = $([0-9]* "." $[0-9]+)




// ======== Lexical Elements =======

// identifiers must not start with a digit
// can only contain letters, digits or underscore
identifier
	= str:$([a-z_]i[a-z0-9_]i*) &{ return isStringAKeyword(str) ? false : true; } { return str; } 

integer
  = $[0-9]+

// this is the token separator. It is to be placed between every token of the ruleset as per the generated whitespace delimited tokens of the preprocesser. 
// it is optional, as certain rulesets containing optional lists like |.., ","| may not be present, so the separator needs to be optional to not fail parsing rules containing these empty lists.
// Otherwise, the optional setting does not affect anything, as it is guaranteed by the preprocesser that all tokens are delimited by whitespaces
_ "token separator"
  = " "
