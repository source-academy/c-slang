enum Numbers { START = 5, NEXT, RESET = -2, AFTER, HEX = 0x10, END, };

int main() {
  return START + NEXT + RESET + AFTER + HEX + END;
}
