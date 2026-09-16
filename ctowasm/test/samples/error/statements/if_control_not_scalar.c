// Control expression of if statement not scalar type
// Violates 6.8.4.1/1 of C17 standard.
int main() {
  int arr[10];
  if (arr) { // this is fine (arr decay to pointer)
    
  }
  struct X { int x; } x;
  if (x) { // this is not fine - non scalar expr

  }
}