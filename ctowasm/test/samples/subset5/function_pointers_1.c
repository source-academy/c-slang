#include <source_stdlib>

int f1() {
  print_int(0);
  return 10;
}

void f2() {
  print_int(5);
}

struct A {
  int (*ap1)();
  int x;
  void (*ap2)();
};

int main() {
  int (*p1)() = f1;
  int (*p2)() = ******f1; // multiple derefs shouldnt make a difference
  void (*p3)() = &f2;
  struct A a = { f1, 2, f2 }; // initializing a struct with funciton pointers

  // call function pointers
  p1();
  p2();
  p3();
  a.ap1();
  a.ap2();
}