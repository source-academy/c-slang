int a = 0;
int b = 0;

int fa(void) { return ++a; }

int fb(void) { return ++b; }

struct S { int x; int y; };

int fib(int n) { return n < 2 ? n : fib(n - 1) + fib(n - 2); }

int depth(int n) {
  int local = n;
  return n == 0 ? local : depth(n - 1) + 0 * local;
}

int main(void) {
  struct S s = { 1, 2 };
  int t = fa() + fb();
  int u = s.x + (s.y = 5);
  int v = fib(10);
  int w = depth(3) + depth(3);
  return (t == 2) + (u == 6) + (v == 55) + (w == 0) - 4;
}
