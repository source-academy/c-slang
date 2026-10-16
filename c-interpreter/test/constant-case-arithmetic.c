enum { CHOICE = 2 + 3 };
int main(void) {
  switch (CHOICE) {
    case 1 << 2: return 0;
    case CHOICE: return 1;
    default: return 0;
  }
}
