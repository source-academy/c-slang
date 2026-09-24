int main() {
  unsigned int a = -1;
  unsigned int b = a << 4;
  unsigned int expected = -16;
  return (b == expected) ? 1 : 0;
}
