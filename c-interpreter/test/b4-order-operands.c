int count = 0;

int next(void) { return ++count; }

int main(void) {
  int d = next() - next();
  return d + 1;
}
