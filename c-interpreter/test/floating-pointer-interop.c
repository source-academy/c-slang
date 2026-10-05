int main() {
  double values[3] = {1.25, 2.5, 3.75};
  float small[2] = {4.5f, 5.75f};
  double *p = values;
  float *q = small;
  const double *read = p;
  void *saved = p;
  double *heap = malloc(2 * sizeof(double));
  double *null = 0;
  if (!heap || *read != 1.25 || (double *)saved != p) return 0;
  p++;
  *p += 0.5;
  q++;
  *q = 6.25f;
  heap[0] = *p;
  heap[1] = *q;
  if (p - values != 1 || q - small != 1) return 0;
  if (p + 2 != values + 3 || values[1] != 3.0 || small[1] != 6.25f) return 0;
  if (sizeof values != 24 || sizeof small != 8) return 0;
  print(*read);
  print(heap[0]);
  print(heap[1]);
  print(null);
  free(heap);
  return 1;
}
