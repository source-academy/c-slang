struct Pair { float f; double d; };
union Value { int tag; struct Pair pair; double scalar; };
struct Envelope { char tag; union Value value; float tail; };
struct Pair adjust(struct Pair value) {
  value.f += 0.25f;
  value.d *= 2.0;
  return value;
}
int main() {
  struct Pair pairs[2] = {{1.25f, 2.5}, {3.75f, 4.5}};
  struct Envelope envelope = {'A', {.pair = {5.25f, 6.5}}, 7.75f};
  double *member = &envelope.value.pair.d;
  struct Pair copy = adjust(pairs[1]);
  *member += 0.5;
  pairs[0] = copy;
  envelope.value.pair = pairs[0];
  if (copy.f != 4.0f || copy.d != 9.0) return 0;
  if (pairs[1].f != 3.75f || pairs[1].d != 4.5) return 0;
  if (*member != 9.0 || envelope.tail != 7.75f || envelope.tag != 'A') return 0;
  if (&pairs[1] - &pairs[0] != 1 || sizeof pairs != 32) return 0;
  if (sizeof(union Value) != 16 || sizeof(struct Envelope) != 32) return 0;
  envelope.value.scalar = 8.5;
  if (envelope.value.scalar != 8.5 || envelope.tail != 7.75f) return 0;
  print(pairs[0]);
  print(envelope.value.scalar);
  return 1;
}
