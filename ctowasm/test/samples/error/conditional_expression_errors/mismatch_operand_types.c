// Mismatch of 2nd and 3rd operands of conditional expression as per
// 6.5.15/3 of the C17 standard

int main() {
  struct X { int x; } a;
  int b;
  1 ? a : b;
}