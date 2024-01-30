#include <source_stdlib>

/**
 * Simple mergesort algorithm using only subset 3 features.
 * Test of array features along with other features.
 */

int arr[10] = {5, 23, 4, 7, 2, 199, -2, 4, 6, 10};

void merge(int start_a, int mid, int end_b) {
  int temp[10];
  int curr_a = start_a;
  int curr_b = mid;
  int curr_temp = 0;
  while (curr_a < mid && curr_b < end_b) {
    if (arr[curr_a] <= arr[curr_b]) {
      temp[curr_temp++] = arr[curr_a++];
    } else {
      temp[curr_temp++] = arr[curr_b++];
    }
  }

  while (curr_a < mid) {
    temp[curr_temp++] = arr[curr_a++];
  }

  while (curr_b < end_b) {
    temp[curr_temp++] = arr[curr_b++];
  }

  for (int i = start_a; i < end_b; ++i) {
    arr[i] = temp[i - start_a];
  }
}

void mergesort(int start, int end) {
  if (end - start <= 1) {
    return;
  }
  int mid = (end + start) / 2;
  mergesort(start, mid);
  mergesort(mid, end);
  merge(start, mid, end);
}

int main() {
  mergesort(0, 10);
  for (int i = 0; i < 10; ++i) {
    print_int(arr[i]);
  }
}