// Incompatible elements in initializer of scalar
int main() {
  struct X { int x; } x;
  int y = x;
}