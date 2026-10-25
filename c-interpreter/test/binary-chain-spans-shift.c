/* Two right shifts of a negative value: the first note belongs to the
   inner operation `x >> 1` only, the second to the whole chain. */
int main(void) {
  int x = -8;
  int y = x >> 1 >> 1;
  return y + 2;
}
