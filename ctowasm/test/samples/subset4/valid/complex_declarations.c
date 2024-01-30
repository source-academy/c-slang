#include <source_stdlib>

/**
 * Test of various function declaration styles.
 */

int f(int, int);
int f2(int x, int y);
int f3(int *a);
int f4(int *, char *);
void f5(int (*)());
int *a;
int (*b)();
int (*c)[];
int *d[];
int (*e)(int, char);
int (*f6())();

int f(int a, int b) {
  return a + b;
}

int f2(int x, int y) {
  return x - y;
}


int main() {
  print_int(f(1,2));
  print_int(f2(3,2));
}

