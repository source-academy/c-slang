// Test violating constraint on remainder as per 6.5.5/2 of C17 standard

int main() {
  float x = 10.0;
  x % 2;
}