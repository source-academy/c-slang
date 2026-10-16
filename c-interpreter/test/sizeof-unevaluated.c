int calls = 0;
int f(void) { calls++; return 1; }
int g(int a[3]) { return sizeof(a) == sizeof(int *); }
int main(void) { int x = 2; int a[3];
  return sizeof(x++) == sizeof(int) && x == 2
    && sizeof(f()) == sizeof(int) && calls == 0 && g(a); }
