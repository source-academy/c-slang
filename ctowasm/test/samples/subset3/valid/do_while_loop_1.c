int main() {
  int i = 10;
  int x = 0;
  do {
    i--;
    x = x + 1;
    print_int(i);
  } while (i > 0);
  print_int(i);
  print_int(x);
}