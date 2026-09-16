/**
 * Malloc 2 - More extensive testing of malloc - allocating aggregate types.
 */
#include <source_stdlib>

struct A {
  int x;
  char c;
  long l;
  char str[20];
};

void print_A(struct A *a) {
  print_int(a->x);
  print_char(a->c);
  print_long(a->l);
  print_string(a->str);
}

int main() {
  // allocate array with malloc
  int *arr = malloc(10 * sizeof(int));
  for (int i = 0; i < 10; ++i) {
    arr[i] = i;
  }
  for (int i = 0; i < 10; ++i) {
    print_int(arr[i]);
  }
  free(arr);

  // allocate struct with malloc
  struct A *a = malloc(sizeof(struct A));
  a->x = 10;
  a->c = 'a';
  a->l = 3147483622;
  
  char s[] = "Hello World!";
  for (int i = 0; i < 13; ++i) {
    a->str[i] = s[i];
  }

  print_A(a);
  free(a);
}
