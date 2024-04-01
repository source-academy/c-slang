#include <source_stdlib>

/**
 * Test comma-separated expressions.
 */

int x = 0;

void f() {
  x += 1;
}

int main() {
  int y = (f(), 10);
  print_int(y);
  y = (4, 5, 6, 7);
  print_int(x);
  print_int(y);
  f(), f(), f();
  print_int(x);
}