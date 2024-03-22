// Struct with incomplete type as member

struct A;
int main() {
  struct B {
    A a;
  };
}