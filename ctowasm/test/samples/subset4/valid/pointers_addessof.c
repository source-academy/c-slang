/**
 * A test of the adress of operator.
 */

int x = 10;
int *xp;
int main() {
  xp = &x;
  int y = 20;
  int *yp = &y;
  print_int(*xp);
  print_int(*yp);
}