/**
 * Test working with arrays of structs.
 * And structs with array fields.
 */
struct A {
  int x[2];
};

struct B {
  int x[3][2];
};

int main() {
  struct A a = {{1,2}};
  struct A arr[2] = {a, {3, 4}};
  print_int(arr[0].x[0]);
  print_int(arr[0].x[1]);
  print_int(arr[1].x[1]);

  struct B b = {{1, 2, 3, 4, 5, 6}};
  print_int(b.x[0][0]);
  print_int(b.x[2][1]);
}