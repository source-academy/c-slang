// Struct with incomplete type as member
// Violates 6.7.2.1/2 of C17 standard.

int main() {
  struct B;
  struct A {
    struct B b;
  };
}