// Dereferencing a non pointer type with *
// Violates 6.5.3.2/2 of the C17 standard

int main() {
  int x = 10;
  *x;
}