// Test violating constraint on logical and as per 6.5.13/2 of C17 standard

int main() {
  struct A { int x; } x;
  x && 4; // does not fulfill any constraint
}