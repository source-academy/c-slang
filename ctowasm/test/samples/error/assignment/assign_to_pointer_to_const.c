// Attempt to assign pointer to const to pointer to non const.
// Violates 6.5.16.1 of the C17 standard.
int main() {
  const int x = 10;
  const int *p = &x;
  int * const pp = p;
}