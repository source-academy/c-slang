#include <source_stdlib>

int main() {
  int x = 12;
  int y = 4 && 12 || 23 && x || 123 || 22 && x;
  print_int(x);
  print_int(y);
}