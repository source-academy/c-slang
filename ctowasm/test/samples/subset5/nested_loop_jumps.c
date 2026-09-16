/**
 * Test the functionality of continue and break jump statements in nested loops.
 */
#include <source_stdlib>

int main() {
  int i = 0;
  while (i < 10) {
    int j = 0;
    while (j < 10) {
      print_int(j++);
      int k = 0;
      while (k < 10) {
        break;
      }
      continue;
    }
    break;
  }
}
