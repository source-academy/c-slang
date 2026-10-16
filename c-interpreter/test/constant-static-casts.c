_Static_assert((char)300 == 44 && (char)100 == 100, "char conversion");
_Static_assert((signed char)128 == -128, "signed char conversion");
_Static_assert((short)-100000 == 31072, "negative narrowing");
_Static_assert((int)~0u == -1 && (long)~0UL == -1, "signed conversion");
_Static_assert((long long)~0ULL == -1, "long long conversion");
_Static_assert((unsigned char)-1 == 255 && (unsigned short)65536 == 0, "unsigned narrowing");
_Static_assert((_Bool)256 == 1 && (_Bool)0 == 0, "bool conversion");
_Static_assert((1 ? (unsigned char)255 : -1) == 255, "conditional promotions");
int main(void) { return 1; }
