int main(void) {
  return __STDC__ == 1 && __STDC_VERSION__ == 201710L &&
         sizeof __STDC_VERSION__ == sizeof(long) ? 0 : 1;
}
