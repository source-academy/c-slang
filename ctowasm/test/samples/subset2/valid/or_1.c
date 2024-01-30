#include <source_stdlib>

int main() {
  int x = 0;
  int y = x || 10 || 12;
  print_int(x);
  print_int(y);
}