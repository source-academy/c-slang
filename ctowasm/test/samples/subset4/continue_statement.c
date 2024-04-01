#include <source_stdlib>

/**
 * Test continue statement functionality.
 */
int main() {
  int x = 0;
  int i = 0;
  while (i < 10) {
    i++;
    continue;
    x++;
  }
  for (;i < 20; i++) {
    i++;
    continue;
    x++;
  }
  print_int(x);
  print_int(i);
}