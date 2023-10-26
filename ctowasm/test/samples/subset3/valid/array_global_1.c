int arr[] = {1, 2, 3};
int brr[2] = {4, 5};
int crr[2];

int main() {
  int x = arr[2];
  int y = brr[1];
  arr[1] = 10;
  int z = arr[1];
  
  for (int i = 0; i < 2; i++) {
    crr[i] = 10 * (i + 1);
  }
  int zz = crr[1];
}