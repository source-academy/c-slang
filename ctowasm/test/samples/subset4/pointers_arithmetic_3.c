#include <source_stdlib>

/**
 * Pointers arithmetic 3
 * Test pointer subtraction.
 */

int main() {
  int arr[4] = {1,2,3,4};
  int *a = &arr[0];
  int *b = &arr[2];
  print_int(b - a);
  print_int(a - b);
}