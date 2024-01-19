/**
 * Test a few ways of declaring structs.
 * 
 */
struct A {
  int x;
  char c;
  int *p;
  long arr[12];
} a;
struct {} b;
struct { int x;} c = { 1 };
struct { struct A aa;} d;
int main() {
}