typedef int T;
int main(void) { sizeof(struct S { T x; enum E { T = 1 } y; });
  return sizeof(T) == sizeof(int) && T == 1; }
