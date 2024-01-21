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

struct C {
  int arr[2][2][2];
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
// test returning struct
struct A create(int x, int y, int arr1, int arr2) {
  struct A a = {x, y, arr1, arr2};
  return a;
}

struct C createC() {
  struct C c = {1, 2, 3, 4, 5, 6, 7, 8};
  return c;
}

int main() {
  struct A a = {1, 2, 3, 4};
  struct B b = {10, {20, 30, 40, 50}};
  print_int(b.a.arr[1]);
  f(a, b);

  struct A c = create(5, 6, 7, 8);
  print_int(c.x);
  print_int(c.y);
  print_int(c.arr[0]);
  print_int(c.arr[1]);
  
  // test
  print_int(create(9, 10, 11, 12).x);
  print_int(create(9, 10, 11, 12).y);
  print_int(create(9, 10, 11, 12).arr[0]);
  print_int(create(9, 10, 11, 12).arr[1]);

  print_int(createC().arr[1][0][1]);
}