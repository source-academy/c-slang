/**
 * Structs test 2
 * - test more complicated structs
 * - test passing structs to functions
 */

struct A {
  int x;
  char c;
  long l;
  int arr[2];
};

struct B {
  struct A a;
  int arr[2];
};

int f() {
  
}

int main() {
  struct A a = {10, 'a', 200, {1, 2}};
  struct B b = {a, {20, 30}};
  print_long(a.l);
}