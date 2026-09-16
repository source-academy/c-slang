// Trying to use sizeof on incomplete type
// Violates 6.5.3.4/2 of the C17 standard
int main() {
  struct A;
  sizeof(struct A); // A is incomplete at this point
  struct A {int x;};  
}