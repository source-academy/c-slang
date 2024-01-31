// Test conditional expressions
#include <source_stdlib>

int f() {
  print_int(-1);
  return -1;
}

int main() {
  int x = 1 ? 2 : 3;
  print_int(x);

  // test that implicit arithmetic conversion works
  long y = 100;
  print_long(x == 2 ? y : x);

  // test that short circuiting works
  int a = 1 ? 1 : f(); // f() should not be called
  int b = 0 ? f() : 2; // f() should not be called
  print_int(a);
  print_int(b);

  // test that conditionals can be used as statements and side effects will be included
  1 ? f() : f();
  0 ? f() : f();
}