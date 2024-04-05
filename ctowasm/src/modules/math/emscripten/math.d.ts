import "emscripten";
interface MathModule extends EmscriptenModule {
  cwrap: typeof cwrap;
  _acos(x: number): number;
  _asin(x: number): number;
  _atan(x: number): number;
  _cos(x: number): number;
  _cosh(x: number): number;
  _sin(x: number): number;
  _sinh(x: number): number;
  _tan(x: number): number;
  _tanh(x: number): number;
  _exp(x: number): number;
  _log(x: number): number;
  _log10(x: number): number;
  _pow(base: number, exp: number): number;
  _sqrt(x: number): number;
  _ceil(x: number): number;
  _floor(x: number): number;
}

export default function mathModuleFactoryFn(): Promise<MathModule>;
