/**
 * Test the ability to declare pointers to incomplete types, 
 * as long as the type is subsequently defined later in the program.
 */
struct A *p;
struct A {
  int x;
};

struct B *pp;

enum E *ep;

enum E {
  a
};

struct B {
  struct B *p;
} b;

int main() {
  struct C *pp;
  struct C {
    char x;
  };
  struct A a = {2};
  p = &a;
  print_int(p->x);

  struct B b = {0}; // null pointer
  print_address(b.p);
}