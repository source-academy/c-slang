var Root = (function () {
    function Root(children) {
        this.name = "Root";
        this.children = children;
    }
    return Root;
}());
export { Root };
var Block = (function () {
    function Block(children) {
        this.children = children;
    }
    return Block;
}());
export { Block };
var Initialization = (function () {
    function Initialization(type, variable, value) {
        this.type = type;
        this.variable = variable;
        this.value = value;
    }
    return Initialization;
}());
export { Initialization };
var Declaration = (function () {
    function Declaration(type, variable) {
        this.type = type;
        this.variable = variable;
    }
    return Declaration;
}());
export { Declaration };
var Function = (function () {
    function Function(returnType, name, parameters, body) {
        this.returnType = returnType;
        this.name = name;
        this.parameters = parameters;
        this.body = body;
    }
    return Function;
}());
export { Function };
