signed char same(signed char c) { return c; }

signed char big(void) { return 300; }

int main(void) {
  return same(200) + big() + 12;
}
