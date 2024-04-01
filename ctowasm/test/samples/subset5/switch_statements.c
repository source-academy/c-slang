/**
 * Test parsing of switch statements.
 */
#include <source_stdlib>

int f(){
  print_int(1);
  return 1;
}

int main() {
  int x = 4; // test fall through - 2 prints
  switch (x) {
    case 1:
    case 2:
    case 3:
      f();
      break;
    case 4:
      f();
    default:
      f();
  }

  switch (f()) x = 11; // functionally useless except for sideeffect expression - 1 print

  x = 3; // test specific branch with break - 1 print
  switch (x) {
    case 1:
    case 2:
    case 3:
      f();
      break;
    case 4:
      f();
    default:
      f();
  }

  x = 5; // test default branch - 1 print
  switch (x) {
    case 1:
    case 2:
    case 3:
      f();
      break;
    case 4:
      f();
    default:
      f();
  }

  
  switch (f()) {}; // functionally useless except for sideeffect expression - 1 print
}