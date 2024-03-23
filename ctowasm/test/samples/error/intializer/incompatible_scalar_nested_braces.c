// Incompatible eleents in initializer of scalar in intializer list
int main() {
  struct X { int x; } x;
  int y = {{x}};
}