//// Perform prefix ! on non scalar type
// Violates 6.5.3.3/1 of C17 standard

int main() {
  struct {int x;} x;
  !x;
}