int global[] = {1, 2, 3};

int check(int depth) {
  int local[] = {depth, 5};
  int matrix[][2] = {{1, 2}, {3}};
  if (depth > 0 && !check(depth - 1)) return 0;
  return sizeof local == 2 * sizeof(int) && local[0] == depth
      && local[1] == 5 && sizeof matrix == 4 * sizeof(int)
      && matrix[1][0] == 3 && matrix[1][1] == 0;
}

int main() {
  return sizeof global == 3 * sizeof(int) && global[2] == 3 && check(2);
}
