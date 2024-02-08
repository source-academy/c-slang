#include <source_stdlib>

int main() {
  int *x = malloc(4);
  *x = 10;
  print_int(*x);
  free(x);
}