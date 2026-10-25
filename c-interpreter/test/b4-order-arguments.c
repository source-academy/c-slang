int count = 0;

int next(void) { return ++count; }

int sub(int a, int b) { return a - b; }

int main(void) {
  return sub(next(), next()) + 1;
}
