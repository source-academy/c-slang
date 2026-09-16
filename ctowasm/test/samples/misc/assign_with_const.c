// Test initialization & assignment to a const and vice versa 
#include <source_stdlib>
int main() {
  const int x = 1;
  int y = 2;
  
  const int a = y; // intialize const with non const
  int b = y;

  y = b;

  print_int(a);
  print_int(y);
}