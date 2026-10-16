typedef double T;
int main(void) { return sizeof(T) == sizeof(double)
  && sizeof(T *) == sizeof(double *) && (int)(T)3 == 3
  && sizeof(T) + 1 == sizeof(double) + 1; }
