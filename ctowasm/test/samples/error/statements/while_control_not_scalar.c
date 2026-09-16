// Control expression of while loop not scalar
// Violates 6.8.5/2 of C17 standard

int main() {
  int *p;
  while (p) { // ok - ptr is sclar

  }

  struct A {int x;} x;
  for (int i =0; x; ++i) { // not ok - struct not scalar
    break;
  } 
}