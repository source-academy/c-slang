// Test the scoping of declarations in switch statements
#include <source_stdlib>

int main() {
  int x = 10;
  int y = 20;
  switch (x) {
    default: {
      int x = 50;
      print_int(x);
    }
      print_int(x);
   
  }
  print_int(x);
  print_int(y);
}