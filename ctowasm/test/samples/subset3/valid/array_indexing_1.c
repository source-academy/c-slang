int temp[3];

int main() {
  int x = 0;
  temp[x++] = 1;
  temp[x] = 2;
  print_int(x);
  for (int i = 0; i < 3; ++i) {
    print_int(temp[i]);
  }
}