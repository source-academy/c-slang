interface MathModule extends EmscriptenModule {
  cwrap: typeof cwrap;
	_sin(x: number): number;
}

export default function mathModuleFactoryFn(): Promise<MathModule>;