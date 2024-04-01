#include <source_stdlib>

int main() {
  int x = 2;
  if (x == 1) {
    int y = 1;
    x = 1;
    print_int(x);
    print_int(y);
  } else if (x == 2) {
    int y = 2;
    x = 100;
    print_int(x);
    print_int(y);
  } else if (x == 3) {
    int y = 3;
    x = 3;
    print_int(x);
    print_int(y);
  } else {
    int y = 4;
    x = 4;
    print_int(x);
    print_int(y);
  }
}