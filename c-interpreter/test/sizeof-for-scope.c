typedef char T;
int main(void) { int ok = 0;
  for (int T = 0; T < 1; T++) ok = sizeof(T) == sizeof(int);
  return ok && sizeof(T) == 1; }
