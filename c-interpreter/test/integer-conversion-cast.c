int main(void) {
  long long minimum = -9223372036854775807LL - 1;
  long long_minimum = -(long)(~0UL >> 1) - 1;
  return (char)300 == 44
      && (signed char)128 == -128
      && (short)-100000 == 31072
      && (int)2147483648LL == (-2147483647 - 1)
      && (long)((~0UL >> 1) + 1UL) == long_minimum
      && (long long)9223372036854775808ULL == minimum;
}
