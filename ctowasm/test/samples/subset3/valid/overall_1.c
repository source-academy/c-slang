/**
 * This is a simple program where the power of 2 to 10 is calculated. It tests
 * that some of the main features (for loops, select statements and comments) 
 * developed in subset 3 can be compiled together correctly in the same program.
 */

/**
 * Calculates the power of base to positive exponent(exp).
 */
int pow(int base, int exp) {
  int result = base;
  if (exp == 0) {
    return 1;
  }
  for (int i = 1; i < exp; ++i) {
    result *= base;
  }
  return result;
}

int main() {
  int x = pow(2, 10);
} 