#include <source_stdlib>

int main() {
  int x = 5;
  int y = 10;
  int z = 12;
  x = y = z = 19;
  print_int(x);
  print_int(y);
  print_int(z);
}