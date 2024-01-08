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
    "auto", "float", "break", "short", "switch", "void", "const", "if", "else", "for", "long", "signed", "typedef", "int", "continue", "volatile", "enum", "while", "rigester", "static", "union", "case", "sizeof", "goto", "extern", "double", "return", "struct ", "unsigned", "char", "do", "default"
  ])

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
    // return {
    //   type: "BinaryExpression",
    //   leftExpr: currNode,
    //   rightExpr: exprsWithOperatorArr[exprsWithOperatorArr.length - 1][1],
    //   operator: exprsWithOperatorArr[exprsWithOperatorArr.length - 1][0]
    // }
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
      currNode = {
        ...operation,
        expr: currNode
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
    for (let i = operations.length - 1; i >= 0; --i) {
      const operation = assignmentOperations[i]
      // check if operator is null
      if (operation[1] !== null) {
        // compound assignment
        currNode = {
          type: "Assignment",
          lvalue: operation[0],
          expr: {
            type: "BinaryExpression",
            leftExpr: operation[0],
            rightExpr: currNode,
            operator: operation[1]
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

    // only pointers and functions can have null type specifier - void type
    if (typeSpecifierDataType === null) {
      if (currNode.type === "primary") {
        error(`Variable or field declared as void`, location());
      } else if (currNode.type === "array") {
        error(`Declaration of array of voids`, location());
      }
    }
    return typeSpecifierDataType;
  }


  

  // Recursively traverses a tree of declarators to create a DataType object and extract the name of the symbol with this dataType,
  // returning the object with type: { name: string, dataType: DataType }
  // this function is able to evaluate declarators used in function declarations that do not have a symbol as well.
  function convertDeclaratorIntoDataTypeAndSymbolName(declarator, typeSpecifierDataType) {
    const result = {};
    let currNode = result;
    // helper function to add datatype to currNode
    function addDataType(dataTypeToAdd) {
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
    currNode.dataType = typeSpecifierDataType;
    return result;
  }

  // evaluates the return of init_declarator or declarator with the given array of declaration specifiers, to return a declaration
  // TODO: edit this function when more specifiers are supported
  // TODO: edit this function to support structs
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
      if (typeof declarationNode.initializer !== undefined) {
        if (declarationNode.initializer.type !== "InitializerList") {
          error("Invalid initializer for array", location());
        }
        // Array size deduction based on initializer list size
        if (typeof declarationNode.dataType.numElements === "undefined") {
          declarationNode.dataType.numElements = generateNode("IntegerConstant", { value: BigInt(declarator.initializer.values.length) });
        }
      } else if (typeof declarationNode.dataType.numElements === "undefined") {
        // no intializer provided, if numElements not defined, then it is set to 1 - provide warning to user
        warning(`Array ${declarationNode.name} assumed to have 1 element`);
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
    return convertDeclaratorIntoDataTypeAndSymbolName(declarator, typeSpecifierDataType);
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

    // Unpacks an array containing declarations which may consist of multiple declaratons
  function unpackDeclarations(blockItems) {
    const unpackedItems = [];
    blockItems.forEach(item => {
      if (Array.isArray(item)) {
        unpackedItems.push(...item);
      } else {
        unpackedItems.push(item);
      }
    })
    return unpackedItems;
  }

  // // evaluate a string consisting of expressions using C operators on constants, which JS supports
  // function evaluateConstantExpressionString(str) {
  //   //TODO: check behaviour if a huge constant value is provided
  //   // eval() is safe to use here since the parser only allows strings with numeric constants and operators to be passed to this function

  //   function evaluateAndExpressionString(andStr) {
  //     const orRegex = /&&/gi
  //     let result, indices;
  //     while ((result = orRegex.exec(str))) {
  //         indices.push(result.index);
  //     }
  //     if (indices.length > 0) {
  //       let prvIndex = 0;
  //       let result;
  //       for (let i = 0; i < indices.length; ++i) {
  //         result = +eval(str.slice(prvIndex, indices[i])) !== 0 && result !== 0 ? 1 : 0;
  //         if (result === 0) {
  //           return result;
  //         }
  //         prvIndex = indices[i] + 2;
  //       }
  //       result = +eval(str.slice(indices[indices.length - 1], str.length))
  //       return result;
  //     }

  //     return eval(andStr);
  //   }

  //   try {
  //     // need to specially handle && and || as their behaviour in JS differs from C (they preserve value, C redueces to 0 (false) or 1 (true))
  //     const orRegex = /||/gi
  //     let result, indices;
  //     while ( (result = orRegex.exec(str)) ) {
  //         indices.push(result.index);
  //     }
  //     if (indices.length > 0) {
  //       let prvIndex = 0;
  //       let result;
  //       for (let i = 0; i < indices.length; ++i) {
  //         result = evaluateConstantExpressionString(str.slice(prvIndex, indices[i])) !== 0 || result !== 0 ? 1 : 0;
  //         if (result === 1) {
  //           return result;
  //         }
  //         prvIndex = indices[i] + 2;
  //       }
  //       result = evaluateConstantExpressionString(str.slice(indices[indices.length - 1] + 2, str.length))
  //     }
      

      
  //     const orRegex = /||/gi
      
      
  //     return +eval(str); // use "+" operator to convert boolean types to integer
  //   } catch (error) {
  //     error("Invalid expression used for array size", location());
  //   }
  // }
}

// ======== Beginning of Grammar rules =========

program = children:translation_unit  { return generateNode("Root", { children }); }

// a translation unit represents a complete c program
// should return an array of Statements or Functions
translation_unit 
  = items:(function_definition / declaration)|.., _| { return unpackDeclarations(items); } //TODO: come back here for ;
   
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
	= "{" _ children:block_item_list _ "}" { return generateNode("Block", { children }); }
    
block_item_list
  = items:block_item|.., _| { return unpackDeclarations(items); } // unpack any arrays, as declarations can declare multiple symbols in one declarations which equates to multiple declaration nodes

block_item
  = declaration
  / statement

// ========= Jump Statement ==========

jump_statement
  = "return" _ expr:expression? _ ";" { return generateNode("ReturnStatement", { value: expr === null ? undefined : expr } ); }
  / "break" _ ";" { return generateNode("BreakStatement"); }
  / "continue" _ ";" { return generateNode("ContinueStatement"); }


// ========= Expression Statement =========

expression_statement
  = @expression? _ ";" // the optional specifier allows us to match empty specifiers


// ========== Iteration Statement ============

iteration_statement
  = "do" _ body:statement _ "while" _ "(" _ condition:expression _ ")" _ ";" { return generateNode("DoWhileLoop", { condition, body }); } // dowhile loops need to end with a ';'
  / "while" _ "(" _ condition:expression _ ")" _ body:statement { return generateNode("WhileLoop", { condition, body }); }
  / "for" _ "(" _ clause:expression? _ ";" _ condition:expression? _ ";" _ update:expression? _ ")" _ body:statement { return generateNode("ForLoop", { clause: clause === null ? null : { type: "Expression", value: clause }, condition, update, body }); }
  / "for" _ "(" _ clause:declaration _ condition:expression? _ ";" _ update:expression? _ ")" _ body:statement { return generateNode("ForLoop", { clause: { type: "Declaration", value: clause }, condition, update, body }); }


// ========== Selection Statement ===========

selection_statement
  = "if" _ "(" _ condition:expression _ ")" _ ifStatement:statement _ "else" elseStatement:statement { return { type: "SelectionStatement", condition, ifStatement, elseStatement }; } 
  / "if" _ "(" _ condition:expression _ ")" _ ifStatement:statement { return { type: "SelectionStatement", condition, ifStatement }; }



// ======== Declarations ========

// declaration returns an array of declaration nodes
declaration
  = declarationSpecifiers:declaration_specifiers _ initDeclarators:init_declarator_list _ ";" { return initDeclarators.map(initDeclarator => evaluateDeclarator(declarationSpecifiers, initDeclarator) ); }

declaration_specifiers
  = declaration_specifier|1.., _|

// TODO: add more specifiers
declaration_specifier
  = dataType:type_specifier { return { type: "TypeSpecifier", dataType } }

// type specifier should return a DataType
type_specifier
	=  primaryDataType:primary_type_specifier { return primaryDataType === "void" ? null : { type: "primary", primaryDataType }; }
  // TODO: add struct and typedef later

primary_type_specifier
  = float_type // check for float type first, due to "long double" needing to be checked before "long" by itself
  / signed_integer
  / unsigned_integer
  / "void"

init_declarator_list 
  = init_declarator|.., _ "," _|

init_declarator
  = declarator:declarator _ "=" _ initializer:initializer  { return { ...declarator, initializer  }; } // this rule must come first as per PEG parsing behaviour
  / declarator:declarator

declarator 
  = pointers:pointer? _ directDeclarator:direct_declarator { return pointers !== null ? createPointerDeclaratorNode(pointers, directDeclarator) : directDeclarator; }

// TODO: add type qualifiers to pointer
pointer 
  = "*"|.., _|

initializer
  = list_initializer
  / value:expression  { return createInitializerSingle(value); }

list_initializer
  = "{" _ list:list_initializer|.., _ "," _ | (_ "," / "") "}" { return createInitializerList(list); } // list initializer can end with extra comma

direct_declarator 
  = directDeclarator:direct_declarator_helper _ declaratorSuffixes:( function_declarator_suffix / array_declarator_suffix )|.., _| { return evaluateDeclaratorSuffixes(directDeclarator, declaratorSuffixes); } 

direct_declarator_helper // helper rule to remove left recursion in direct_declarator. Works fine as you cannot have a function returning a function in C.
  = symbolName:identifier { return { type: "SymbolDeclarator", symbolName }; }
  / "(" _ @declarator _ ")" 

// This rule, along with array_declarator_suffix, are helper rules to avoid left recursion, to use Peggy.js || expressions instead
function_declarator_suffix
  = "(" _ parameterDataTypesAndNames:parameter_list _ ")" { return { type: "FunctionDeclarator", parameters: parameterDataTypesAndNames.dataTypes, parameterNames: parameterDataTypesAndNames.names }; }

array_declarator_suffix
  = "[" _ numElements:expression _ "]" { return { type: "ArrayDeclarator", numElements }; }
  / "[" _ "]" { return { type: "ArrayDeclarator", numElements: undefined }; } 

parameter_list
  = parameters:parameter_declaration|.., _ "," _| { return splitParameterDataTypesAndNames(parameters); }

parameter_declaration
  = declarationSpecifiers:declaration_specifiers _ declarator:declarator { return convertParameterDeclarationToDataTypeAndSymbolName(declarationSpecifiers, declarator); }
  / declarationSpecifiers:declaration_specifiers _ abstractDeclarator:abstract_declarator? { return convertParameterDeclarationToDataTypeAndSymbolName(declarationSpecifiers, abstractDeclarator); }// to support function declarations without explicit function paramter names 

// an abstract declarator is specifically for function declaration parameters that do not have names given to them
abstract_declarator
  = pointers:(@pointer _)? directAbstractDeclarator:direct_abstract_declarator { return pointers !== null ? createPointerDeclaratorNode(pointers, directAbstractDeclarator) : directAbstractDeclarator; }
  / pointers:pointer { return createPointerDeclaratorNode(pointers, { type: "AbstractDeclarator" }); };

direct_abstract_declarator
  = directAbstractDeclarator:(@direct_abstract_declarator_helper _)? _ declaratorSuffixes:( function_declarator_suffix / array_declarator_suffix )|.., _| { return evaluateDeclaratorSuffixes(directAbstractDeclarator !== null ? directAbstractDeclarator : { type: "AbstractDeclarator" }, declaratorSuffixes); }  

direct_abstract_declarator_helper
  = "(" _ @abstract_declarator _ ")"








// ========== Expressions ========

expression
  = assignment

assignment
  = assignmentOperations:(@logical_or_expression _ @("+" / "-" / "*" / "/" / "%" / "<<" / ">>" / "&" / "^" / "|")? "=" _ )+ firstExpr:logical_or_expression { return createAssignmentTree(firstExpr, assignmentOperations); }
  / logical_or_expression

// binary expressions are ordered by operator precedence (top is least precedence, bottom is highest precedence)
logical_or_expression
  = firstExpr:logical_and_expression tail:(_ @"||" _ @logical_and_expression)+ { return createLeftToRightBinaryExpressionTree(firstExpr, tail); }
  / logical_and_expression

logical_and_expression
  = firstExpr:bitwise_or_expression tail:(_ @"&&" _ @bitwise_or_expression)+ { return createLeftToRightBinaryExpressionTree(firstExpr, tail); }
  / bitwise_or_expression

bitwise_or_expression
  = firstExpr:bitwise_xor_expression tail:(_ @("|") _ @bitwise_xor_expression)+ { return createLeftToRightBinaryExpressionTree(firstExpr, tail); }
  / bitwise_xor_expression

bitwise_xor_expression 
  = firstExpr:bitwise_and_expression tail:(_ @("^") _ @bitwise_and_expression)+ { return createLeftToRightBinaryExpressionTree(firstExpr, tail); }
  / bitwise_and_expression

bitwise_and_expression 
  = firstExpr:equality_relational_expression tail:(_ @("&") _ @equality_relational_expression)+ { return createLeftToRightBinaryExpressionTree(firstExpr, tail); }
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
  = firstExpr:multiply_divide_expression tail:(_ @[+\-] _ @multiply_divide_expression)+ { return createLeftToRightBinaryExpressionTree(firstExpr, tail); }
  / multiply_divide_expression

multiply_divide_expression
  = firstExpr:prefix_expression tail:(_ @[%/*] _ @prefix_expression)+ { return createLeftToRightBinaryExpressionTree(firstExpr, tail); }
  / prefix_expression // as the last binary expression (highest precedence), this rule is needed

prefix_expression 
  = operations:(_ @prefix_operation)+ firstExpr:postfix_expression { return createPrefixExpressionNode(firstExpr, operations); }
  / postfix_expression

prefix_operation
  = operator:("++" / "--"){ return { type: "PrefixArithmeticExpression", operator }; }
  / operator:("+" / "-" / "!" / "~") { return { type: "PrefixExpression", operator }; }
  / operator:("*") { return { type: "PointerDereference" }; }
  / "&" { return { type: "AddressOfExpression" }; }
  / "sizeof" _ { return { type: "SizeOfExpression"}; }

postfix_expression
  = firstExpr:primary_expression operations:(_ @postfix_operation)+ { return createPostfixExpressionNode(firstExpr, operations); }
  / primary_expression

// all the postfix operations
postfix_operation
  = operator:("++" / "--") { return { type: "PostfixArithmeticExpression", operator }; }
  / "(" _ args:function_argument_list _ ")" { return { type: "FunctionCall", args }; } //TODO: check
  / "[" _ index:expression _ "]" { return { type: "ArrayElementExpr", index }; }
//  / "." _ field:identifier { return } TODO: when doing structs
//  / "->" _ TODO: when structs and pointers are done

function_argument_list
  = expression|.., _ "," _|

primary_expression
  = "sizeof" _ "(" _ expr:primary_expression _ ")" { return generateNode("SizeOfExpression", { expr } ); } // TODO: check this, since no postfix opreator can be applied to result of sizeof, putting it here should be fine
  / name:identifier { return generateNode("VariableExpr", { name }); } // for variables 
  / constant
  / "(" _ @expression _ ")"




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
  = "'" value:c_char "'" {return generateNode("IntegerConstant", { value }); } // value should already be a number




//=========== Characters ============

// All the possible C characters that can be in a source file
source_c_set
  = [a-z0-9!"#%&\'()*+,-./: ;<=>?\[\\\]^_{|}~ \n\t\v\f]i
  / extended_c_char
// 
c_char
  = char:[a-z0-9!"#%&()*+,-./: ;<=>?\[\]^_{|}~\t\v\f]i { return char.charCodeAt(0); }
  / extended_c_char
  / escape_sequence

// Characters not required to be in the basic character set, but should be supported.
extended_c_char
  = char:[@] { return char.charCodeAt(0); }

escape_sequence
  = simple_escape_sequence
  
simple_escape_sequence 
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
	= $([a-z_]i[a-z0-9_]i*)

integer
  = $[0-9]+

// this is the token separator. It is to be placed between every token of the ruleset as per the generated whitespace delimited tokens of the preprocesser. 
// it is optional, as certain rulesets containing optional lists like |.., ","| may not be present, so the separator needs to be optional to not fail parsing rules containing these empty lists.
// Otherwise, the optional setting does not affect anything, as it is guaranteed by the preprocesser that all tokens are delimited by whitespaces
_ "token separator"
  = " "?
