/**
 * Test bitwise XOR.
 */
int main() {
  long a = 1123124325;
  long b = 1221345234;
  int c = -123;
  unsigned int d = 6540;

  print_long(a ^ b);
  print_long(b ^ c);
  print_int(c ^ d);
  print_int_unsigned(a ^ d);
}