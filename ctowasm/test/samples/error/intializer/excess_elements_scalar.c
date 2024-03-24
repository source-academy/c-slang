// Excess elements in intializing a scalar (nested in a struct)
// Violates 6.7.9/2 of the C17 standard
int main() {
  struct { int x; } x = { {1,2} };
}
