int main(void) {
  int x = 7;
  switch (sizeof(int)) {
    case sizeof(x++): break;
    default: return 0;
  }
  switch (1) {
    case 0 ? (1 / 0) : 1: break;
    default: return 0;
  }
  return x == 7;
}
