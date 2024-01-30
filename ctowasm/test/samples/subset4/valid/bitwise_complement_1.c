#include <source_stdlib>

int main() {
  int a = 123;
  int b = 215345;
  long c = -12312;
  unsigned int d = 232;
  unsigned long e = 435234;

  print_int(~a);
  print_int(~b);
  print_long(~c);
  print_int_unsigned(~d);
  print_long_unsigned(~e);
}