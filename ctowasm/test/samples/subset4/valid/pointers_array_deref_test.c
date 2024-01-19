/**
 * Test that dereferencing a pointer to an array gives a pointer to the array element type.
 * This needed to be handled specifically in the processor, due to the fact that the value
 * of the pointer to the array is already the value of pointer to the array (needs to be kept same).
 */

int main() {
  int arr[2] = {1,2};
  int (*x)[2] = &arr;
  print_int((*x)[1]);
  // the next few expressions should have the same value
  print_address(arr);
  print_address(x);
  print_address(*x);
}