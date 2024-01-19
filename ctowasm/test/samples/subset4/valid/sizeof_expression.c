int main() {
  char a;
  short b;
  int c;
  long d;
  int arr[10];
  int *p = &c;

  print_int_unsigned(sizeof a);
  print_int_unsigned(sizeof(b));
  print_int_unsigned(sizeof(c));
  print_int_unsigned(sizeof(d));
  print_int_unsigned(sizeof(arr));
  print_int_unsigned(sizeof(p));
  //print_int_unsigned(sizeof(long));
}