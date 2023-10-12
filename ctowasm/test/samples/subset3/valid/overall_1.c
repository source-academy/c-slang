int pow(int x, int exp) {
  int result = x;
  if (exp == 0) {
    return 1;
  }
  for (int i = 1; i < exp; ++i) {
    result *= x;
  }
  return result;
}

int main() {
  int x = 2;
  x = pow(2, 10);
} 