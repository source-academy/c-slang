// Test violating constraint on addition as per 6.5.6/2 of C17 standard

int main() {
  struct A { int x; } x;
  x + 4; // does not fulfill any constraint
}