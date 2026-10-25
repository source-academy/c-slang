int f(int a, int b) { return a + b; }

int main(void) {
  int i = 0;
  return f(i, i++);
}
