#include <source_stdlib>

int main() {
  int a[] = {1, 2};
  a[0] = 10;
  for (int i = 0; i < 2; ++i) {
    print_int(a[i]);
  }
}