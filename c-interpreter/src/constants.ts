// Numerical limits
// See: 5.2.4.2
// =====================================
export const CHAR_BIT = BigInt(8);
export const SCHAR_MIN = -((BigInt(1) << BigInt(7)) - BigInt(1));
export const SCHAR_MAX = (BigInt(1) << BigInt(7)) - BigInt(1);
export const UCHAR_MAX = (BigInt(1) << CHAR_BIT) - BigInt(1);
export const CHAR_MIN = SCHAR_MIN; // 6.2.5.15
export const CHAR_MAX = SCHAR_MAX;
export const MB_LEN_MAX = 1;
export const SHRT_MIN = -((BigInt(1) << BigInt(15)) - BigInt(1));
export const SHRT_MAX = (BigInt(1) << BigInt(15)) - BigInt(1);
export const USHRT_MAX = (BigInt(1) << BigInt(16)) - BigInt(1);
export const INT_MIN = -((BigInt(1) << BigInt(31)) - BigInt(1));
export const INT_MAX = (BigInt(1) << BigInt(31)) - BigInt(1);
export const UINT_MAX = (BigInt(1) << BigInt(32)) - BigInt(1);
export const LONG_MIN = -((BigInt(1) << BigInt(31)) - BigInt(1));
export const LONG_MAX = (BigInt(1) << BigInt(31)) - BigInt(1);
export const ULONG_MAX = (BigInt(1) << BigInt(32)) - BigInt(1);
export const LLONG_MIN = -((BigInt(1) << BigInt(63)) - BigInt(1));
export const LLONG_MAX = (BigInt(1) << BigInt(63)) - BigInt(1);
export const ULLONG_MAX = (BigInt(1) << BigInt(64)) - BigInt(1);

// Size in bytes
// =====================================
export const CHAR_SIZE = 1;
export const SCHAR_SIZE = CHAR_SIZE; // 6.2.5.5
export const UCHAR_SIZE = CHAR_SIZE; // 6.2.5.6: unsigned has same size as signed
export const SHRT_SIZE = 2;
export const USHRT_SIZE = SHRT_SIZE;
export const INT_SIZE = 4;
export const UINT_SIZE = INT_SIZE;
export const LONG_SIZE = 4;
export const ULONG_SIZE = LONG_SIZE;
export const LLONG_SIZE = 8;
export const ULLONG_SIZE = LLONG_SIZE;

// Alignment requirements
// https://en.cppreference.com/w/cpp/language/object#Alignment
// typical alignment requirements for 32-bit x86 taken from https://en.wikipedia.org/wiki/Data_structure_alignment
// =====================================
export const CHAR_ALIGN = 1 << 0;
export const SCHAR_ALIGN = 1 << 0;
export const UCHAR_ALIGN = CHAR_ALIGN;
export const SHRT_ALIGN = 1 << 1;
export const USHRT_ALIGN = SHRT_ALIGN;
export const INT_ALIGN = 1 << 2;
export const UINT_ALIGN = INT_ALIGN;
export const LONG_ALIGN = 1 << 2;
export const ULONG_ALIGN = LONG_ALIGN;
export const LLONG_ALIGN = 1 << 3; // windows and linux differs
export const ULLONG_ALIGN = LLONG_ALIGN;
export const MAX_ALIGN = LLONG_ALIGN;
