typedef union Value { int i; long long n; } Value;
Value update(Value value) { value.n += 3; return value; }
int main() {
  const Value original = {.n = 10};
  Value copy = original;
  Value result = update(copy);
  copy = result;
  return original.n == 10 && result.n == 13 && copy.n == 13;
}
