// Test declaration with no type specifiers, but a storage class. Violates 6.7.2/2 of C17 standard.
int main() {
  static;
}