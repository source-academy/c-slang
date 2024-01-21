/**
 * Test different initializer list formats.
 */
struct A {
 int x;
 int y[2];
};

int arr_g[2][2] = {1 , 2};
int arr2_g[2][2] = {{1, 2}, {3, 4}};
struct A a_g[2] = {1, 2, 3, 4, 5, 6};
struct A a2_g[2] = {1, {2, 3}, 4, {5, 6}};
struct A a3_g[2] = {1, {2}, 4, {5}}; // purposely restrict numbers in the nested initializer for zeroing effect

int main() {
  int arr[2][2] = {1 , 2};
  int arr2[2][2] = {{1, 2}, {3, 4}};
  struct A a[2] = {1, 2, 3, 4, 5, 6};
  struct A a2[2] = {1, {2, 3}, 4, {5, 6}};
  struct A a3[2] = {1, {2}, 4, {5}}; // purposely restrict numbers in the nested initializer for zeroing effect
  print_int(arr[0][0]);
  print_int(arr[0][1]);
  print_int(a[1].y[1]);
  print_int(a2[0].x);
  print_int(a2[0].y[0]);
  print_int(a2[0].y[1]);
  print_int(a3[0].y[1]); // should be zero

  print_int(arr_g[0][0]);
  print_int(arr_g[0][1]);
  print_int(a_g[1].y[1]);
  print_int(a2_g[0].x);
  print_int(a2_g[0].y[0]);
  print_int(a2_g[0].y[1]);
  print_int(a3_g[0].y[1]); // should be zero
}