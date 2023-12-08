int main() {
  int i = 10;
  int x = 0;
  do {
    print_int(i);
    i--;
    x = x + 1;
  } while (i > 0);
  print_int(i);
  print_int(x);
}