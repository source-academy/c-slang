/* Flagged before it runs, and a runtime fault when it does. */
int main(void) {
  int i = 1;
  return i++ + i++;
}
