/**
 * Test using structs as parameters to functions, and returning structs from functions.
 */
struct A {
  int x;
  int y;
  int arr[2];
};

struct B {
  long x;
  struct A a;
};

// test passing struct as param
void f(struct A a, struct B b) {
  print_int(a.x);
  print_int(a.y);
  print_int(a.arr[1]);
  print_long(b.x);
  print_int(b.a.x);
  print_int(b.a.y);
  print_int(b.a.arr[0]);
  print_int(b.a.arr[1]);
}

int main() {
  struct A a = {1, 2, 3, 4};
  struct B b = {10, {20, 30, 40, 50}};
  print_int(b.a.arr[1]);
  f(a, b);
}