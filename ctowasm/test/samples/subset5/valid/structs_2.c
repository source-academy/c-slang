/**
 * Structs test 2
 * - test more complicated structs
 * - test struct assignment
 */

struct A {
  int x;
  char c;
  long l;
  int arr[2];
};

int main() {
  struct A a = {10, 'a', 200, {1, 2}};
  struct A b = a;
  print_long(a.l);
  a.l += 20;
  print_long(a.l);
  print_int(a.arr[1]);
  a.arr[1] *= 20;
  print_int(a.arr[1]);

  print_long(b.l);
  print_int(b.arr[1]);
}