#include <source_stdlib>

// intialize array with set size
int main() {
  int a[5] = {1, 2, 3, 4, 5};
  for (int i = 0; i < 5; ++i) {
    print_int(a[i]);
  }
}