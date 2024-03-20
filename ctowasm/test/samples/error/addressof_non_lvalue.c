// Trying to take address of non lvalue
// Violates 6.5.3.2/1 of C17 standard

int main() {
  int *x = &1;
}

