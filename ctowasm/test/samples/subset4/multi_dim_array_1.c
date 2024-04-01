#include <source_stdlib>

/**
 * Test multi dimensional arrays.
 */

int arr[3][2] = {{1,2}, {3, 4}, {5, 6}};
int main() {
  char arr2[2][3] = {{1,2,3}, {4, 5, 6}};
  long arr3[2][2][2] = {{{1, 2}, {3, 4}}, {{5, 6}, {7, 8}}};
  print_int(arr[0][0]);
  print_int(arr2[1][2]);
  print_long(arr3[1][1][1]);

  // test that pointer to array correctly iterates over multi dim array
  int (*p)[2] = &arr[0];
  print_int((*++p)[0]);
}