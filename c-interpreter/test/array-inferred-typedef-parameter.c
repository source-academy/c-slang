typedef int Numbers[];

int sum(int []);

int sum(int values[]) {
  return values[0] + values[1];
}

int main() {
  Numbers first = {1, 2};
  Numbers second = {3, 4, 5};
  int (*p)[] = &first;
  return sizeof first == 2 * sizeof(int)
      && sizeof second == 3 * sizeof(int)
      && sum(first) == 3 && sum(second) == 7 && p == &first;
}
