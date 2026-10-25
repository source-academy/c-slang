/* The conflict only arises if i++ is evaluated; here it is not. */
int main(void) {
  int c = 0;
  int i = 0;
  int r = (c && i++) + i;
  return r;
}
