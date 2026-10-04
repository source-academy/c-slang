union U { char bytes[9]; int words[2]; };
struct S { char c; int n; };
int main() {
  union U values[2];
  union U *p = values;
  struct S s;
  return sizeof(union U) == 3 * sizeof(int)
      && sizeof values == 2 * sizeof(union U)
      && (char *)&p->words == (char *)&p->bytes
      && (char *)&values[1] - (char *)&values[0] == sizeof(union U)
      && sizeof s == 2 * sizeof(int) && (char *)&s.n > (char *)&s.c;
}
