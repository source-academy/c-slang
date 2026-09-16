#include <source_stdlib>

/**
 * Test of arrays as function parameters.
 */
int f(int[]);

int f(int x[2]) {
  return x[1];
}

int main() {
  int arr[2] = { 1, 2 };
  print_int(f(arr));
}