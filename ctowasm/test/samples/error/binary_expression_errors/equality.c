// Test violating constraint on equality expression as per 6.5.9/2 of C17 standard
int main() {
  struct X { int x; } x;
  int *p;
  char *pp;
  p != pp;
}