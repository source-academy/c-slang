/**
 * Subscript array expression with non pointer type.
 * Violates 6.5.2.1/1 constraint in C17 standard.
 */

int main() {
  int x;
  int y = x[1];
}