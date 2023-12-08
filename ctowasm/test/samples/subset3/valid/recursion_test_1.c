int x = 0;

void f(int a, int b) {
  if (b - a <= 1) {
    return;
  }
  x++;
  f(a, b - 1);
}

int main() {
  print_int(f(0, 3));
}