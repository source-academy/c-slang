/**
 * Simple mergesort algorithm using only subset 3 features.
 * Test of array features along with other features.
 */

void merge(long arr[], int start_a, int mid, int end_b) {
  long temp[5];
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

void mergesort_recursive_helper(long arr[], int start, int end) {
  if (end - start <= 1) {
    return;
  }
  int mid = (end + start) / 2;
  mergesort_recursive_helper(arr, start, mid);
  mergesort_recursive_helper(arr, mid, end);
  merge(arr, start, mid, end);
}

void mergesort(long arr[], int length) {
  mergesort_recursive_helper(arr, 0, length);
}

int main() {
  long arr[5] = {1231, -5353, 12, 1231123, 234};
  mergesort(arr, 5);
  for (int i = 0; i < 5; ++i) {
    print_long(arr[i]);
  }
}