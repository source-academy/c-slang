/**
 * Test enforcement of postfix increment constraint on type that is not real or pointer.
 * Constraint 6.5.2.4/1 of C17 standard.
 */

int main() {
  struct {int x;} t;
  t++;
}