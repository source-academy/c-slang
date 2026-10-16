_Static_assert((2 + 3 * 4 - 6) / 2 == 4, "precedence and division");
_Static_assert(-7 / 3 == -2 && -7 % 3 == -1, "signed division and remainder");
_Static_assert(((5 | 2) ^ 3) == 4 && (7 & 3) == 3, "bitwise operators");
_Static_assert(~0u == 4294967295u && ~5 == -6, "complement");
_Static_assert(((unsigned char)1 << 10) == 1024 && (32 >> 3) == 4, "shift promotions");
_Static_assert(+3 == 3 && -3 < 0 && !0 && !!5, "unary operators");
_Static_assert(3 <= 3 && 4 > 3 && 4 >= 4 && 3 != 4, "comparisons");
_Static_assert(-1 > 1u && -1LL < 1u, "usual arithmetic conversions");
_Static_assert(0xffffffffu + 1 == 0 && (1 ? -1 : 0u) == ~0u, "unsigned wrap");
_Static_assert((2 || 1 / 0) && !(0 && (2147483647 + 1)), "short circuit");
_Static_assert((1 ? 7 : 1 / 0) == 7 && (0 ? 1 / 0 : 9) == 9, "conditional");
_Static_assert('b' - 'a' == 1 && '\n' == 10, "character constants");
int main(void) { return 1; }
