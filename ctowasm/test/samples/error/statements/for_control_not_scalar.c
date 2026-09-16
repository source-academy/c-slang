// Control expression of for loop not scalar
// Violates 6.8.5/2 of C17 standard

int main() {
  int arr[1];
  for (int i = 0; arr; ++i) { // ok - array decayed to ptr is sclar
    break;
  }
  
  struct A {int x;} x;
  for (int i =0; x; ++i) { // not ok - struct not scalar
    break;
  }
}