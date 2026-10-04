union U { unsigned int word; unsigned char bytes[4]; unsigned int other; };
int main() {
  union U u = {0x01020304};
  unsigned int original = u.other;
  int sum = u.bytes[0] + u.bytes[1] + u.bytes[2] + u.bytes[3];
  u.other = 0;
  u.bytes[2] = 7;
  return original == 0x01020304 && sum == 10 && u.word != 0
      && u.bytes[0] == 0 && u.bytes[1] == 0 && u.bytes[3] == 0;
}
