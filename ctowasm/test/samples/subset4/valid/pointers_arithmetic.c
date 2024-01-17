/**
 * Test that pointer arithmetic functions correctly.
 * 
 */

int arr[] = {1,2,3};

int main() {
  int arr2[] = {4,5,6};
  int *ap = &arr[0];
  int *ap2 = &arr2[0];

  // test pointer addition
  int *ap3 = ap + 2;
  int *ap4 = ap2 + 2;
  print_int(*ap3);
  print_int(*ap4);

  // test pointer subtraction
  print_int(*(ap3 - 1));
  print_int(*(ap4 - 1));
}