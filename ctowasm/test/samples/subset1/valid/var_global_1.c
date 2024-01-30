#include <source_stdlib>

int x = 10;
int y = 30;
int main() {
  x = 20;
  int a = x;
  int b = y;
  print_int(x);
  print_int(y);
  print_int(a);
  print_int(b);
}