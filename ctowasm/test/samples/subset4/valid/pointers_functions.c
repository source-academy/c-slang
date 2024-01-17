/**
 * Test passing pointers as function parameters and returning pointers.
 */

int a = 10;
int *f() {
  return &a;
}
void f2(int *p) {
  print_int(*p);
}
int f3() {
  return 230;
}

int main() {
  print_int(*f());
  f2(&a);
  print_int(f3());
}