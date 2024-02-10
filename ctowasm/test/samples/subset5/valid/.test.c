// NOT AN OFFICIAL TEST CASE- to use in future 
#include <source_stdlib>

struct A {
  int i;
  char c;
  long l;
};

int main() {
  struct A a = {1, 'a', 10};
  a = adjust_a(a); // -> should include the first and 2nd args eg adjust_a(1, a, 2). but error message dosent tell us
  print_int(a.i);
  print_char(a.c);
  print_long(a.l);
}