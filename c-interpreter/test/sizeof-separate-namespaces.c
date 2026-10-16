typedef int T;
struct T { char T; }; int main(void) { struct T s;
  return sizeof(T) == sizeof(int) && sizeof(s.T) == 1; }
