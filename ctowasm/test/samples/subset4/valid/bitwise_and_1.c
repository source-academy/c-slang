/**
 * Test bitwise and.
 */

int main() {
  int a = 10;
  int b = 20;
  long c = 10;
  char d = 9;
  d = d & a;
  c = c & b;
  print_long(c);
  print_int(d);
}