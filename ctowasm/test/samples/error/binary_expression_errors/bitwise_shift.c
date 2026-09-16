// Test violating constraint on bitwise shift as per 6.5.7/2 of C17 standard
int main() {
  float x = 10.0;
  x << 2;
}