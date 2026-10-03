int global[5] = {1, 2, 3};

int main() {
  int local[5] = {[2] = 7};
  char text[4] = "hi";
  return sizeof global == 5 * sizeof(int) && global[2] == 3
      && global[3] == 0 && global[4] == 0 && local[0] == 0
      && local[2] == 7 && local[4] == 0 && text[3] == 0;
}
