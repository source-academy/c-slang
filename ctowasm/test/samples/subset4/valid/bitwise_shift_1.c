#include <source_stdlib>

/**
 * Test of binary bitwise shift operations.
 */

int main() {
  int a = 123;
  int b = -145;
  unsigned int c = 156;
  long d = 2147483647;
  d = d << 2;
  a = a >> 2 << 3;
  b = b >> 10; // implementation defined for negative number - add 1s
  c = c << 32;
  print_int(a);
  print_int(b);
  print_int_unsigned(c);
  print_long(d);
}

