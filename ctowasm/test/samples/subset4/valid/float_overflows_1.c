/**
 * Test float overflow behaviour. This is undefined in the standard,
 * but in this compiler implementation, it follows other compilers by setting the 
 * float value to "inf".
 */

int main() {
  double a = 1.0E100;
  float b = a; // out of range of this float
  float c = a - 123123; // c should still be "inf"
  print_float(b);
  print_float(c);
}