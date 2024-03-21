// Use of non scalar as first operand of conditional expression
// Violates 6.5.15/2 of C17 standard
int main() {
  struct X { int x; } x;
  x ? 1 : 2;
}