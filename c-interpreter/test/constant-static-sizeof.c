int calls = 0;
int f(void) { ++calls; return 1; }
int main(void) {
  int x = 7;
  int a[3];
  typedef int T;
  _Static_assert(sizeof(T) == sizeof(int), "type name");
  _Static_assert(sizeof(x) == sizeof(int), "variable");
  _Static_assert(sizeof(a) == 3 * sizeof(int), "array without decay");
  _Static_assert(sizeof(++x) == sizeof(int), "prefix not evaluated");
  _Static_assert(sizeof(x--) == sizeof(int), "postfix not evaluated");
  _Static_assert(sizeof(x = 99) == sizeof(int), "assignment not evaluated");
  _Static_assert(sizeof((x, 1)) == sizeof(int), "comma not evaluated");
  _Static_assert(sizeof(f()) == sizeof(int), "call not evaluated");
  _Static_assert(sizeof((double)x) == sizeof(double), "floating cast not evaluated");
  _Static_assert(sizeof((int *)0) == sizeof(int *), "pointer cast not evaluated");
  return x == 7 && calls == 0;
}
