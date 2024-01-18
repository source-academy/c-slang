/**
 * Test pointer comparisons.
 * 
 */

int main() {
  int arr[3] = {1,2,3};
  int *a = &arr[0];
  int *b = &arr[2];

  print_int(a < b);
  print_int(a <= b);
  print_int(a != b);
  print_int(a == b);
  print_int (a >= b);
  print_int(a > b);
}