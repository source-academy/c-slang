int * p = (int * ) malloc(10);
int (*q)[3];
struct S { int x; char y; struct { char c; } z; } s;
int ea[2];
int arr[5][3];
short s1, s2;
int i;
int * pp;
int * test[3];

int addInt(int n, int m) {
  return n + m;
}

int (*fnPtr)(int, int);
int sum;

int main() {
  test[1] = &sum;
  test[2] = (int *) malloc(sizeof (struct S) * 3);
  test[0] = (int *) malloc(sizeof q * 3);
  fnPtr = &addInt;
  sum = (********fnPtr)(2, 3);
  s1 = s2 = 10ull;
  p = (int * ) 1;
  s.z.c = 'A';
  ea[1] = -3;
  arr[0][4] = -1;
  pp = arr[1];
  1[pp] = 69;
  free(test[0]);
}