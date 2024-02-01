/**
 * Test parsing of switch statements.
 */

void f(){

}

int main() {
  int x = 10;
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

  switch (x) x = 11;

  switch (x) {};
}