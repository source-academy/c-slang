// Attempting compound addition to non-lvalue
// Violates 6.5.16/2 of C17 standard
int main() {
  int *p;
  1 += p;
}