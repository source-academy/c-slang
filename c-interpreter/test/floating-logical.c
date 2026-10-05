int main() {
  float zero = 0.0f;
  float negative_zero = 0.0f / (0.0f - 1.0f);
  double nan = 0.0 / 0.0;
  double infinity = 1.0 / 0.0;
  if (!zero != 1 || !negative_zero != 1 || !0.0 != 1) return 0;
  if (!0.25f != 0 || !(0.0 - 0.25) != 0) return 0;
  if (!nan != 0 || !infinity != 0) return 0;
  if (!!negative_zero != 0 || !!nan != 1 || !!infinity != 1) return 0;
  if ((negative_zero && 1) != 0 || (1 && negative_zero) != 0) return 0;
  if ((negative_zero || 0) != 0 || (0 || negative_zero) != 0) return 0;
  if ((nan && 0.25f) != 1 || (0.25f || infinity) != 1) return 0;
  if (sizeof(!zero) != sizeof(int) || sizeof(0.0 && 1.0) != sizeof(int)) return 0;
  if ((1 && negative_zero) + (0 || nan) != 1) return 0;
  return 1;
}
