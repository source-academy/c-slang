int main(void) {
  char date[] = __DATE__;
  char time[] = __TIME__;
  char stamp[] = __DATE__ " " __TIME__;
  if (sizeof date != 12 || sizeof time != 9 || sizeof stamp != 21) return 1;
  for (int i = 0; i < 11; i++) {
    if (date[i] != stamp[i]) return 2;
  }
  for (int i = 0; i < 8; i++) {
    if (time[i] != stamp[i + 12]) return 3;
  }
  return date[3] == ' ' && date[6] == ' ' && time[2] == ':' &&
         time[5] == ':' && stamp[11] == ' ' ? 0 : 4;
}
