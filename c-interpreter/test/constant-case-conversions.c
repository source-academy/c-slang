int main(void) {
  unsigned int u = ~0u;
  signed char c = -1;
  switch (u) {
    case -1: break;
    default: return 0;
  }
  switch (c) {
    case ~0u: break;
    default: return 0;
  }
  switch (44) {
    case (char)300: return 1;
    default: return 0;
  }
}
