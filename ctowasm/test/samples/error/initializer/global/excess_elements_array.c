// Excess elements in initializer
// Violates 6.7.9/1 of C17 standard
int main() {
  int arr[2] = { 1, 2, 3 };
}