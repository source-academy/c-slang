// Test the use of enumerator where an lvalue is expected
int main() {
  enum A { x };
  x++; // x is not lvalue, this is invalid
}