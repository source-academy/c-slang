/**
 * Test sizeof(expression) functionality. The other variant of sizeof with type specifier will be done in sizeof_expression_2.c
 */

int main() {
  char a;
  short b;
  int c;
  long d;
  int arr[10];
  int (*p)[10] = &arr;
  int (**pp)[10] = &p;

  print_int_unsigned(sizeof a);
  print_int_unsigned(sizeof(b));
  print_int_unsigned(sizeof(c));
  print_int_unsigned(sizeof(d));
  print_int_unsigned(sizeof(arr));
  print_int_unsigned(sizeof(p));
  print_int_unsigned(sizeof(pp));
  print_int_unsigned(sizeof(*pp));
  print_int_unsigned(sizeof(**pp)); 
  print_int_unsigned(sizeof(arr + 2));
}