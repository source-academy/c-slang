/**
 * Test various unsigned int types.
 */

unsigned char a = 'a';
unsigned char b = 10;
unsigned short c = 20;
unsigned int d = -10; // should be interpreted as 4294967286
unsigned int e = 100;
unsigned long f = 4294967296;

int main() {
  unsigned int g = e + d;
  print_char(a);
  print_int_unsigned(b);
  print_int_unsigned(c);
  print_int_unsigned(d);
  print_int(d);
  print_int_unsigned(e);
  print_long_unsigned(f);
  print_int_unsigned(g);
}