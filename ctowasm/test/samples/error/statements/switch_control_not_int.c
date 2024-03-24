// Controlling expression of if statement not int
// Violates 6.8.4.2/1 of C17 standard

int main() {
  enum { a } e;
  switch (e) { // this is fine - enum is int type

  }
  int *p;
  switch (p) { // this is not fine - non int type

  }
}