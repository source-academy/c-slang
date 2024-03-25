// Control expression of dowhile loop not scalar
// Violates 6.8.5/2 of C17 standard

int main() {
  float y = 1.223;
  do { 
 
  } while (y); // ok - float is scalar
  
  struct A {int x;} x;
  do { 
 
  } while (x); // not ok
}