/**
 * Test pointers with different types.
 */

int arr[2][2] = {{1 ,2}, {3, 4}};
int main() {
    int (*p)[2] = &arr[0];
    print_int((*++p)[0]);
}