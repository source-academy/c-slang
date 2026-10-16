enum E { VALUE = 2 };
int f(void) { return 7; }
int main(void) { return sizeof(f()) == sizeof(int)
  && sizeof(VALUE) == sizeof(int); }
