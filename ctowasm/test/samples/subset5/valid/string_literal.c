/**
 * Test string literals.
 */

int main() {
  char str[] = "hello world";
  print_string(str);
  str[0] = 'H';
  str[6] = 'W';
  print_string(str);
}