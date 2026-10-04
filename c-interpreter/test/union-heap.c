union U { int first; struct { int a; int b; } pair; int values[3]; };
int main() {
  union U source = {.values = {1, 2, 3}};
  union U *p = malloc(sizeof(union U));
  *p = source;
  p->pair.b = 7;
  int result = p->values[1] == 7 && p->values[2] == 3;
  free(p);
  p = malloc(sizeof(union U));
  *p = source;
  result = result && p->values[1] == 2;
  free(p);
  return result;
}
