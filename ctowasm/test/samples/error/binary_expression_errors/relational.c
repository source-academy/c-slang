// Test violating constraint on relational expression as per 6.5.8/2 of C17 standard
int main() {
  struct X { int x; } x;
  x < 2;
}