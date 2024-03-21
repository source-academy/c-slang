// Test violating constraint on bitwise and expression as per 6.5.10/2 of C17 standard
int main() {
  float x = 10;
  x & x;
}