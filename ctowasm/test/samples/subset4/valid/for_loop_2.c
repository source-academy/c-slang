/**
 * Test variant of for loops with no declaration, just expressions.
 */
int main() {
  long x = 0;
  int i = 20;
  for (i = 0; i < 5; ++i) {}
  for (;i < 10; i++) {
    x++;
  }
  for (;i < 10;) {

  }
  print_int(i);
  print_long(x);
}