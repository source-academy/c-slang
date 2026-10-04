int main() {
  if ((signed char)(0.0 - 128.75) != -128 || (signed char)127.75 != 127) return 0;
  if ((short)(0.0 - 32768.75) != -32768 || (short)32767.75 != 32767) return 0;
  if ((int)(0.0 - 2147483648.75) != -2147483647 - 1) return 0;
  if ((long)(0.0 - 2147483648.75) != -2147483647L - 1L) return 0;
  if ((int)2147483647.75 != 2147483647) return 0;
  if ((long long)(0.0 - 9223372036854775808.0) != -9223372036854775807LL - 1) return 0;
  if ((long long)9223372036854774784.0 != 9223372036854774784LL) return 0;
  if ((unsigned int)4294967295.75 != 4294967295U) return 0;
  if ((unsigned long long)18446744073709549568.0 != 18446744073709549568ULL) return 0;
  return 1;
}
