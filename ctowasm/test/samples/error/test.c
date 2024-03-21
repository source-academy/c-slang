#include <source_stdlib>
int main() {
  struct A;
  struct A x;
    struct A {int x; int y;};
    
  print_int(sizeof(struct A));

}

