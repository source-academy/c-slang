int arr[2][5];

int main() {
  int i;
  int j;

  i = 0;
  while (i < 2) {
    j = 0;
    while (j < 5) {
      arr[i][j] = i * 10 + j;
      j = 1 + j;
    }
    i = 1 + i;
  }

  print(arr[0][4]);
  print(arr[1][0]);
  return arr[1][3];
}
