typedef char T;
int f(int (*p)(int T), T x) { return sizeof(x) == 1; }
int main(void) { return f(0, 1); }
