// Test advanced practical usage of function pointers
#include <source_stdlib>

int ARR_LENGTH = 8;
int arr[] = {2, 1, 4, 11, 23, 5, -10, -200};

// sort will sort arr using cmp
// cmp is a function that returns 3 way comparison between two ints
void sort(int (*cmp)(int, int)) {
  for (int i = 1; i < ARR_LENGTH; ++i) {
    int j = i;
    while (j > 0 && cmp(arr[j - 1], arr[j]) > 0) {
      int temp = arr[j];
      arr[j] = arr[j - 1];
      arr[j - 1] = temp;
      j--;
    }
  }
}

int asc(int a, int b) {
  return a - b;
}

int desc(int a, int b) {
  return b - a;
}

int main() {
  int (*cmp_arr[2])(int, int) = {asc, desc};
  for (int i = 0; i < 2; i++) {
    sort(cmp_arr[i]);
    print_string("Sorted output");
    for (int j = 0; j < ARR_LENGTH; ++j) {
      print_int(arr[j]);
    }
    print_string("End of sorted output");
  } 
}