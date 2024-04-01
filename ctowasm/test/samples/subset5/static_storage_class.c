#include <source_stdlib>

/**
 * Static storage class tests.
 */

int x = 10;
void f() {
  static int x = 0;
  print_int(x);
  x++; // x should end up at 10
}

void f2() {
  static struct A {
    char c;
    long d;
  } a; // should be zero intialized
  print_int(a.c);
  print_long(a.d);
  a.c++; // should end up at 10
  a.d += 2; // should end up at 20
}

int main() {
  for (int i = 0; i < 10; i++) {
    f();
  }
  for (int i = 0; i < 10; i++) {
    f2();
  }
}

