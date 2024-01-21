/**
 * Structs test 1
 * - test struct declarations
 * - test basic struct member access 
 * 
 */
struct A {
  int x;
  char c;
  int *p;
  long arr[12];
} a;
struct {} b;
struct C { int x;} c = { 1 };
struct { struct A aa;} d;
int main() {
  struct C *p = &c;
  int x = c.x;
  int y = p->x;
  print_int(x);
  print_int(y);
}