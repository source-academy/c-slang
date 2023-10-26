int x = 0;

void f(int a, int b) {
  if (b - a <= 1) {
    return;
  }
  x++;
  f(a, b - 1);
}

int main() {
  f(0, 3);
  int a = x;
}