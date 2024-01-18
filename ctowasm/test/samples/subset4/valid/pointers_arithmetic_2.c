/**
 * Test pointer arithmetic with different pointer types.
 */

long arr[2][2] = {{1 ,2}, {3, 4}};
int main() {
  char a = 'a';
  char b = 'b';
  char *parr[] = {&a, &b};
  char *(*p)[2] = &parr;
  print_char(*((*p)[1]));
  print_long(arr[1][1]);

  long *pp = &arr[0][0];
  print_long(*(pp + 1));
}