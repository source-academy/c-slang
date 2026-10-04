int main() {
  signed char byte = -128;
  short small = -32768;
  int integer = -2147483647 - 1;
  long wide = -2147483647L - 1L;
  long long widest = -9223372036854775807LL - 1LL;
  if (byte != -128 || small != -32768) return 0;
  if (integer != ~2147483647 || wide != -2147483647L - 1L) return 0;
  if (widest != ~9223372036854775807LL) return 0;
  if ((unsigned char)byte != 128 || (unsigned short)small != 32768) return 0;
  if ((unsigned int)integer != 2147483648U || (unsigned long long)widest != 9223372036854775808ULL) return 0;
  return 1;
}
