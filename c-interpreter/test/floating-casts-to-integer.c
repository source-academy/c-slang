int main() {
  if ((int)3.9 != 3 || (int)(0.0 - 3.9) != -3) return 0;
  if ((long long)3.9f != 3 || (short)(0.0f - 3.9f) != -3) return 0;
  if ((unsigned int)3.9 != 3U || (unsigned char)(0.0 - 0.75) != 0) return 0;
  if ((int)0.75 != 0 || (int)(0.0 - 0.75) != 0) return 0;
  if ((char)65.9 != 'A' || (unsigned short)65535.75 != 65535) return 0;
  if ((unsigned long)123.9f != 123UL || (unsigned long long)456.9 != 456ULL) return 0;
  return 1;
}
