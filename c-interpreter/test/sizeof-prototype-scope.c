typedef char T;
int f(int T); T c;
int f(int T) { return sizeof(T) == sizeof(int); }
int main(void) { return sizeof(c) == 1 && sizeof(T) == 1 && f(0); }
