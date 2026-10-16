enum Limits {
  LOW = -2147483647 - 1,
  HIGH = 2147483646 + 1,
  NARROW = (char)300,
  NEGATIVE = (short)-100000,
  SIGNED = (int)~0u,
  AFTER
};
int main(void) {
  return LOW == (-2147483647 - 1) && HIGH == 2147483647
      && NARROW == 44 && NEGATIVE == 31072 && SIGNED == -1 && AFTER == 0;
}
