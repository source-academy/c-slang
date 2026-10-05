struct Pair { int count; double value; };
union Value { int tag; struct Pair pair; };
struct Container { char tag; union Value value; };

int main() {
  struct Container s;
  s.tag = 'A';
  s.value.pair.count = 2;
  s.value.pair.value = 3.5;
  s.value.pair.value += s.value.pair.count;
  if (s.tag != 'A' || s.value.pair.value != 5.5) return 0;
  if (&s.value.pair.value != &(&s)->value.pair.value) return 0;
  print(s.value.pair.value);
  return 1;
}
