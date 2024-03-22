// Duplicate storage class specifier. Violates 6.7.1/2 of C17 standard

int main() {
  typedef static int x;
}