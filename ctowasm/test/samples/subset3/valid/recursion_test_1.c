int x = 0;

void f(int a, int b) {
  print_int(a);
  print_int(b);
  if (b - a <= 1) {
    return;
  }
  x++;
  f(a, b - 1);
}

int main() {
  f(0, 3);
  print_int(x);
}