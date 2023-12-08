int main() {
  int x = 1;
  int y = 2;
  int z = 3;
  x = y += 1;
  x = z -= 1;
  x = y %= 2;
  x = y /= 2;
  x = z %= 3;
  print_int(x);
  print_int(y);
  print_int(z);
}