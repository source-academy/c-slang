// Test using a string literal as an expression
#include <source_stdlib>

int main() {
  char *x = "bye";
  print_string("hello world");
  print_string(x);
}