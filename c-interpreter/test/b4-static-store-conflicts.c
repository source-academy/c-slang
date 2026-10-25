/* Each statement stores to an object its own operand also modifies (C17 6.5p2).
   The runtime cannot see these, so they run; the static pass flags them. */
int main(void) {
  int i = 0;
  int x = 1;
  i = i++ + 1;
  i = i++;
  x += x++;
  x = x = 1;
  return (i == 1) + (x == 1) - 2;
}
