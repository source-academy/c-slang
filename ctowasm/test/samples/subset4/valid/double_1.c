/**
 * Test some double operations.
 */

double a = 1.0E100;
int main() {
  double b = a - 111213;
  double c = 4.5E129;
  double d = c - b;
  double e = d * 10;
  double f = d / 10;
  double g = d + 10 * (1.3 + 9.3e10);
  print_double(a);
  print_double(b);
  print_double(c);
  print_double(d);
  print_double(e);
  print_double(f);
  print_double(g);
}