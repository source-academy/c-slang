// Test qsort functionality
#include <source_stdlib>
#include <utility>
#include <math>

int compare_ints(const void* a, const void* b)
{
    const int *pa = a; // need to do this as typecasting not yet supported
    const int *pb = b; // need to do this as typecasting not yet supported
    int arg1 = *pa;
    int arg2 = *pb;
 
    if (arg1 < arg2) return -1;
    if (arg1 > arg2) return 1;
    return 0;
}
 
int main()
{
    int arr[] = {-2, 99, 0, -743, 2, 4};
    int size = sizeof arr / sizeof *arr;
 
    qsort(arr, size, sizeof(int), compare_ints);
 
    for (int i = 0; i < size; i++) {
        print_int(arr[i]);
    }
}