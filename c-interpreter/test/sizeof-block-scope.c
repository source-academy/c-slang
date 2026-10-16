typedef char T;
int main(void) { { typedef double T; if (sizeof(T) != sizeof(double)) return 0; }
  return sizeof(T) == 1; }
