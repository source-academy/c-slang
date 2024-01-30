#include <source_stdlib>

#include <source_stdlib>
int f() {
  return 1;
}

int main() {
  int x = f();
  f();
  print_int(x);
}