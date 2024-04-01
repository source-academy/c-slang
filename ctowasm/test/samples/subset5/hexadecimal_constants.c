#include <source_stdlib>

/**
 * Test parsing of hexidecimal constants.
 */

int a = 0x12;
int b = 0X77000;
int main() {
  int c = 0x123;
  int d = 0X777;
  print_int(a);
  print_int(b);
  print_int(c);
  print_int(d);
}