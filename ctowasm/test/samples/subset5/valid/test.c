struct A {
  int x;
};
int main() {
  struct A a = {1};
  struct A b = a;
  print_int(b.x);
}