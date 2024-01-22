/**
 * Test parsing of octal integer constants.
 */

int a = 012;
int b = 077000;
int main() {
  int c = 0123;
  int d = 0777;
  print_int(a);
  print_int(b);
  print_int(c);
  print_int(d);
}