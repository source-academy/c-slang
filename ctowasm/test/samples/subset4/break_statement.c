#include <source_stdlib>

/**
 * Test break statement.
 */

int main() {
  int i = 0;
  while (i < 10) {
    break;
    i++;
  } 
  do {
    break;
    i++;
  } while (i < 10);
  for (;i < 10; i++) {
    break;
    i++;
  }
  print_int(i);
}