int main() {
  float x = 1.5f;
  if (++x != 2.5f || x != 2.5f) return 0;
  if (x++ != 2.5f || x != 3.5f) return 0;
  if (--x != 2.5f || x != 2.5f) return 0;
  if (x-- != 2.5f || x != 1.5f) return 0;
  if (sizeof(++x) != sizeof(float) || x != 1.5f) return 0;
  float old = x++;
  float fresh = ++x;
  if (old != 1.5f || fresh != 3.5f || x != 3.5f) return 0;
  return 1;
}
