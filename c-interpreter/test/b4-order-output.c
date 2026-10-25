int show(int n) {
  print(n);
  return n;
}

int main(void) {
  return show(1) + show(2) - 3;
}
