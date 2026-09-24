int main() {
  unsigned int a = 0;
  unsigned int b = ~a;
  unsigned int expected = -1;
  return (b == expected) ? 1 : 0;
}
