// The value in case statement is not an integer.
// Violates 6.8.4.2/3 of C17 standard

int main() {
  int *p;
  switch (5) {
    case p: 
      int x = 10;
  }
}